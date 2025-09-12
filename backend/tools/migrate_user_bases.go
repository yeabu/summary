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

	// 自动迁移新表结构
	fmt.Println("开始迁移用户基地关联表结构...")
	if err := db.DB.AutoMigrate(&models.UserBase{}); err != nil {
		fmt.Printf("迁移用户基地关联表失败: %v\n", err)
		return
	}
	fmt.Println("用户基地关联表迁移成功!")

	// 验证表结构
	fmt.Println("验证表结构...")
	var userBase models.UserBase
	if err := db.DB.First(&userBase).Error; err != nil {
		fmt.Printf("查询UserBase表时出错: %v\n", err)
	} else {
		fmt.Println("UserBase表结构验证通过!")
	}

	// 查询现有用户数据
	fmt.Println("查询现有用户数据...")
	var users []models.User
	if err := db.DB.Preload("UserBases").Find(&users).Error; err != nil {
		fmt.Printf("查询用户数据失败: %v\n", err)
		return
	}
	fmt.Printf("找到 %d 个用户\n", len(users))

	// 显示迁移前的用户基地关联情况
	fmt.Println("迁移前的用户基地关联情况:")
	for _, user := range users {
		if len(user.UserBases) > 0 {
			fmt.Printf("用户 %s 关联的基地数量: %d\n", user.Name, len(user.UserBases))
		}
	}

	// 验证关联数据
	fmt.Println("验证关联数据...")
	var userBases []models.UserBase
	if err := db.DB.Find(&userBases).Error; err != nil {
		fmt.Printf("查询用户基地关联数据失败: %v\n", err)
	} else {
		fmt.Printf("用户基地关联记录总数: %d\n", len(userBases))
	}

	fmt.Println("数据库迁移完成!")
}
