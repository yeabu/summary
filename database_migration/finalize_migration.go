package main

import (
	"fmt"
	"log"
	"strings"

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

	fmt.Println("开始执行最终化迁移...")

	// 直接在代码中定义SQL语句
	sqlStatements := []string{
		// 将category_id字段修改为bigint unsigned类型以匹配expense_categories表的id字段
		"ALTER TABLE base_expenses MODIFY COLUMN category_id BIGINT UNSIGNED NULL",

		// 添加外键约束
		"ALTER TABLE base_expenses ADD CONSTRAINT fk_base_expenses_category_id FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL",

		// 验证修改结果
		"SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'base_expenses' AND COLUMN_NAME = 'category_id'",

		// 检查外键约束
		"SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'base_expenses' AND REFERENCED_TABLE_NAME IS NOT NULL AND COLUMN_NAME = 'category_id'",

		// 显示类别统计
		"SELECT ec.name as category_name, COUNT(be.id) as expense_count FROM expense_categories ec LEFT JOIN base_expenses be ON be.category_id = ec.id GROUP BY ec.id, ec.name ORDER BY expense_count DESC",
	}

	for i, query := range sqlStatements {
		trimmedQuery := strings.TrimSpace(query)
		if trimmedQuery == "" {
			continue
		}

		fmt.Printf("执行语句 %d: %s\n", i+1, trimmedQuery[:min(len(trimmedQuery), 50)]+"...")

		if err := DB.Exec(trimmedQuery).Error; err != nil {
			log.Printf("执行语句 %d 失败: %v\nSQL: %s", i+1, err, trimmedQuery)
		} else {
			fmt.Printf("✓ 语句 %d 执行成功\n", i+1)
		}
	}

	fmt.Println("最终化迁移执行完成！")

	// 验证结果
	verifyMigration()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func verifyMigration() {
	fmt.Println("\n=== 验证最终化迁移结果 ===")

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

	// 显示类别统计
	fmt.Println("\n类别统计:")
	var categories []map[string]interface{}
	err = DB.Raw(`
		SELECT 
			ec.name as category_name,
			COUNT(be.id) as expense_count
		FROM expense_categories ec
		LEFT JOIN base_expenses be ON be.category_id = ec.id
		GROUP BY ec.id, ec.name
		ORDER BY expense_count DESC
	`).Scan(&categories).Error

	if err != nil {
		log.Printf("查询类别统计失败: %v", err)
		return
	}

	for _, cat := range categories {
		fmt.Printf("  %s: %v 条记录\n", cat["category_name"], cat["expense_count"])
	}
}
