package main

import (
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func main() {
	// 使用硬编码的数据库连接信息（从.env文件中获取）
	dsn := "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"
	fmt.Printf("使用数据库连接: %s\n", dsn)

	// 初始化数据库连接
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("数据库连接失败: ", err)
	}

	// 修复category_id值
	fixCategoryIds()

	// 添加外键约束
	addForeignKeyConstraint()

	// 验证结果
	verifyMigration()
}

func fixCategoryIds() {
	fmt.Println("开始修复category_id值...")

	// 将category_id为0的记录更新为NULL
	result := DB.Exec("UPDATE base_expenses SET category_id = NULL WHERE category_id = 0")
	if result.Error != nil {
		log.Printf("更新category_id失败: %v", result.Error)
		return
	}

	fmt.Printf("已更新 %d 条记录，将category_id为0的记录设置为NULL\n", result.RowsAffected)
}

func addForeignKeyConstraint() {
	fmt.Println("添加外键约束...")

	// 先检查是否已存在外键约束
	var constraintExists []map[string]interface{}
	err := DB.Raw(`
		SELECT CONSTRAINT_NAME
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND REFERENCED_TABLE_NAME IS NOT NULL
		AND CONSTRAINT_NAME = 'fk_base_expenses_category_id'
	`).Scan(&constraintExists).Error

	if err != nil {
		log.Printf("检查外键约束失败: %v", err)
		return
	}

	if len(constraintExists) > 0 {
		fmt.Println("外键约束已存在，跳过添加")
		return
	}

	// 添加外键约束
	result := DB.Exec("ALTER TABLE base_expenses ADD CONSTRAINT fk_base_expenses_category_id FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL")
	if result.Error != nil {
		log.Printf("添加外键约束失败: %v", result.Error)
		return
	}

	fmt.Println("外键约束添加成功")
}

func verifyMigration() {
	fmt.Println("\n=== 验证迁移结果 ===")

	// 检查base_expenses表结构
	fmt.Println("检查base_expenses表结构...")
	var columns []map[string]interface{}
	err := DB.Raw(`
		SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
		FROM INFORMATION_SCHEMA.COLUMNS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND COLUMN_NAME = 'category_id'
	`).Scan(&columns).Error

	if err != nil {
		log.Printf("查询表结构失败: %v", err)
		return
	}

	fmt.Println("字段信息:")
	for _, col := range columns {
		fmt.Printf("  字段名: %s, 类型: %s, 可空: %s, 默认值: %v\n",
			col["COLUMN_NAME"], col["COLUMN_TYPE"], col["IS_NULLABLE"], col["COLUMN_DEFAULT"])
	}

	// 检查外键约束
	fmt.Println("\n检查外键约束...")
	var foreignKeys []map[string]interface{}
	err = DB.Raw(`
		SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND REFERENCED_TABLE_NAME IS NOT NULL
		AND COLUMN_NAME = 'category_id'
	`).Scan(&foreignKeys).Error

	if err != nil {
		log.Printf("查询外键约束失败: %v", err)
		return
	}

	if len(foreignKeys) > 0 {
		fmt.Println("✓ category_id 字段已正确设置外键约束:")
		for _, fk := range foreignKeys {
			fmt.Printf("  约束名: %s, 字段: %s -> %s.%s\n",
				fk["CONSTRAINT_NAME"], fk["COLUMN_NAME"], fk["REFERENCED_TABLE_NAME"], fk["REFERENCED_COLUMN_NAME"])
		}
	} else {
		fmt.Println("⚠️ 未找到 category_id 字段的外键约束")
	}

	// 检查category_id值
	fmt.Println("\n检查category_id值:")
	var categoryIds []map[string]interface{}
	err = DB.Raw("SELECT DISTINCT category_id, COUNT(*) as count FROM base_expenses GROUP BY category_id ORDER BY category_id").Scan(&categoryIds).Error
	if err != nil {
		log.Printf("查询base_expenses的category_id失败: %v", err)
		return
	}

	for _, cid := range categoryIds {
		fmt.Printf("  category_id: %v, 数量: %v\n", cid["category_id"], cid["count"])
	}

	// 检查无效的category_id值
	fmt.Println("\n检查无效的category_id值:")
	var invalidIds []map[string]interface{}
	err = DB.Raw(`
		SELECT be.id, be.category_id, be.detail
		FROM base_expenses be
		LEFT JOIN expense_categories ec ON be.category_id = ec.id
		WHERE ec.id IS NULL AND be.category_id IS NOT NULL
	`).Scan(&invalidIds).Error
	if err != nil {
		log.Printf("查询无效的category_id失败: %v", err)
		return
	}

	if len(invalidIds) > 0 {
		fmt.Printf("发现 %d 条记录有无效的category_id值:\n", len(invalidIds))
		for _, record := range invalidIds {
			fmt.Printf("  记录ID: %v, category_id: %v, 详情: %s\n", record["id"], record["category_id"], record["detail"])
		}
	} else {
		fmt.Println("✓ 未发现无效的category_id值")
	}
}
