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

	// 检查BaseExpense模型结构
	fmt.Println("=== BaseExpense模型结构 ===")
	expense := models.BaseExpense{}
	fmt.Printf("模型类型: %T\n", expense)
	fmt.Printf("ID字段: %v\n", expense.ID)
	fmt.Printf("BaseID字段: %v\n", expense.BaseID)
	fmt.Printf("Date字段: %v\n", expense.Date)
	fmt.Printf("CategoryID字段: %v\n", expense.CategoryID)
	fmt.Printf("Category字段: %v\n", expense.Category)
	fmt.Printf("Amount字段: %v\n", expense.Amount)
	fmt.Printf("Detail字段: %v\n", expense.Detail)

	// 检查ExpenseCategory模型结构
	fmt.Println("\n=== ExpenseCategory模型结构 ===")
	category := models.ExpenseCategory{}
	fmt.Printf("模型类型: %T\n", category)
	fmt.Printf("ID字段: %v\n", category.ID)
	fmt.Printf("Name字段: %v\n", category.Name)
	fmt.Printf("Code字段: %v\n", category.Code)
	fmt.Printf("Status字段: %v\n", category.Status)

	// 查询一条实际的开支记录来验证关联
	fmt.Println("\n=== 实际数据验证 ===")
	var actualExpense models.BaseExpense
	result := db.DB.Preload("Base").Preload("Category").First(&actualExpense)
	if result.Error != nil {
		fmt.Printf("查询记录失败: %v\n", result.Error)
	} else {
		fmt.Printf("记录ID: %d\n", actualExpense.ID)
		fmt.Printf("基地ID: %d\n", actualExpense.BaseID)
		fmt.Printf("基地名称: %s\n", actualExpense.Base.Name)
		fmt.Printf("类别ID: %d\n", actualExpense.CategoryID)
		fmt.Printf("类别名称: %s\n", actualExpense.Category.Name)
		fmt.Printf("金额: %.2f\n", actualExpense.Amount)
		fmt.Printf("日期: %s\n", actualExpense.Date.Format("2006-01-02"))
	}

	// 检查外键约束
	fmt.Println("\n=== 外键约束检查 ===")
	var foreignKeys []map[string]interface{}
	err := db.DB.Raw(`
		SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND REFERENCED_TABLE_NAME IS NOT NULL
		AND COLUMN_NAME IN ('base_id', 'category_id')
	`).Scan(&foreignKeys).Error

	if err != nil {
		fmt.Printf("查询外键约束失败: %v\n", err)
	} else {
		fmt.Println("找到的外键约束:")
		for _, fk := range foreignKeys {
			fmt.Printf("  约束名: %s, 字段: %s -> %s.%s\n",
				fk["CONSTRAINT_NAME"], fk["COLUMN_NAME"], fk["REFERENCED_TABLE_NAME"], fk["REFERENCED_COLUMN_NAME"])
		}
	}

	fmt.Println("\n=== 验证完成 ===")
}
