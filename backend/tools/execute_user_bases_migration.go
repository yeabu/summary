package main

import (
	"backend/db"
	"backend/models"
	"fmt"
	"os"
)

func main() {
	// 设置环境变量
	if os.Getenv("MYSQL_DSN") == "" {
		os.Setenv("MYSQL_DSN", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local")
	}
	if os.Getenv("JWT_SECRET") == "" {
		os.Setenv("JWT_SECRET", "REPLACE_THIS_WITH_YOUR_SECRET")
	}

	// 初始化数据库连接
	db.Init()

	fmt.Println("开始执行用户基地关联表迁移...")

	// 1. 创建user_bases表
	fmt.Println("1. 创建user_bases表...")
	if err := db.DB.AutoMigrate(&models.UserBase{}); err != nil {
		fmt.Printf("创建user_bases表失败: %v\n", err)
		return
	}
	fmt.Println("user_bases表创建成功!")

	// 2. 检查users表是否包含base_id字段
	fmt.Println("2. 检查users表结构...")
	hasBaseID, err := hasColumn("users", "base_id")
	if err != nil {
		fmt.Printf("检查users表结构失败: %v\n", err)
		return
	}

	// 3. 如果存在base_id字段，迁移数据到user_bases表
	if hasBaseID {
		fmt.Println("3. 迁移现有数据到user_bases表...")
		if err := migrateUserData(); err != nil {
			fmt.Printf("迁移用户数据失败: %v\n", err)
			return
		}
		fmt.Println("用户数据迁移完成!")
	} else {
		fmt.Println("3. users表中未找到base_id字段，跳过数据迁移")
	}

	// 4. 验证迁移结果
	fmt.Println("4. 验证迁移结果...")
	if err := verifyMigration(); err != nil {
		fmt.Printf("验证迁移结果失败: %v\n", err)
		return
	}
	fmt.Println("迁移结果验证通过!")

	fmt.Println("数据库迁移完成!")
}

// hasColumn 检查表是否包含指定列
func hasColumn(table, column string) (bool, error) {
	var count int64
	err := db.DB.Raw(`
		SELECT COUNT(*) 
		FROM INFORMATION_SCHEMA.COLUMNS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = ? 
		AND COLUMN_NAME = ?
	`, table, column).Scan(&count).Error

	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// migrateUserData 迁移现有用户数据到user_bases表
func migrateUserData() error {
	// 开始事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// 查询所有有base_id的用户
	var users []models.User
	if err := tx.Where("base_id IS NOT NULL").Find(&users).Error; err != nil {
		tx.Rollback()
		return err
	}

	fmt.Printf("找到 %d 个需要迁移的用户\n", len(users))

	// 为每个用户创建user_bases记录
	for _, user := range users {
		if user.BaseID != nil {
			userBase := models.UserBase{
				UserID: user.ID,
				BaseID: *user.BaseID,
			}
			if err := tx.Create(&userBase).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("为用户 %d 创建关联记录失败: %v", user.ID, err)
			}
		}
	}

	// 提交事务
	return tx.Commit().Error
}

// verifyMigration 验证迁移结果
func verifyMigration() error {
	// 检查user_bases表是否存在且有数据
	var count int64
	if err := db.DB.Model(&models.UserBase{}).Count(&count).Error; err != nil {
		return fmt.Errorf("查询user_bases表失败: %v", err)
	}
	fmt.Printf("user_bases表记录数: %d\n", count)

	// 查询一些示例数据
	var userBases []models.UserBase
	if err := db.DB.Preload("User").Preload("Base").Limit(5).Find(&userBases).Error; err != nil {
		return fmt.Errorf("查询user_bases示例数据失败: %v", err)
	}

	fmt.Println("示例用户基地关联:")
	for _, ub := range userBases {
		if ub.User != nil && ub.Base != nil {
			fmt.Printf("  用户: %s -> 基地: %s\n", ub.User.Name, ub.Base.Name)
		}
	}

	// 检查users表结构
	hasBaseID, err := hasColumn("users", "base_id")
	if err != nil {
		return fmt.Errorf("检查users表结构失败: %v", err)
	}
	if hasBaseID {
		fmt.Println("注意: users表中仍包含base_id字段，建议手动删除")
	} else {
		fmt.Println("users表中已不包含base_id字段")
	}

	return nil
}
