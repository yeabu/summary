package main

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
	"os"
)

func main() {
	fmt.Println("验证数据库迁移...")

	// 加载环境变量
	loadEnv()

	// 初始化数据库
	db.Init()

	// 检查expense_categories表是否存在
	fmt.Println("检查expense_categories表...")
	if db.DB.Migrator().HasTable(&models.ExpenseCategory{}) {
		fmt.Println("✓ expense_categories表存在")
	} else {
		log.Fatal("✗ expense_categories表不存在")
	}

	// 检查base_expenses表是否存在
	fmt.Println("检查base_expenses表...")
	if db.DB.Migrator().HasTable(&models.BaseExpense{}) {
		fmt.Println("✓ base_expenses表存在")
	} else {
		log.Fatal("✗ base_expenses表不存在")
	}

	// 检查base_expenses表是否有category_id字段
	fmt.Println("检查category_id字段...")
	if db.DB.Migrator().HasColumn(&models.BaseExpense{}, "CategoryID") {
		fmt.Println("✓ category_id字段存在")
	} else {
		log.Fatal("✗ category_id字段不存在")
	}

	// 检查外键约束
	fmt.Println("检查外键约束...")
	// 这里我们简单地尝试查询一些数据来验证关联是否正常工作
	var categories []models.ExpenseCategory
	if err := db.DB.Find(&categories).Error; err != nil {
		log.Printf("警告: 查询expense_categories表时出错: %v", err)
	} else {
		fmt.Printf("✓ 成功查询到%d个费用类别\n", len(categories))
	}

	var expenses []models.BaseExpense
	if err := db.DB.Preload("Category").Limit(1).Find(&expenses).Error; err != nil {
		log.Printf("警告: 查询base_expenses表时出错: %v", err)
	} else if len(expenses) > 0 {
		expense := expenses[0]
		if expense.Category.ID > 0 {
			fmt.Println("✓ 外键关联正常工作")
		} else {
			fmt.Println("⚠ 外键关联可能存在但未正确加载")
		}
		fmt.Printf("✓ 成功查询到费用记录，ID: %d, CategoryID: %d\n", expense.ID, expense.CategoryID)
	} else {
		fmt.Println("⚠ base_expenses表为空，无法验证外键关联")
	}

	fmt.Println("验证完成!")
}

func loadEnv() {
	file, err := os.Open(".env")
	if err != nil {
		log.Println("警告: .env文件未找到，将使用系统环境变量")
		return
	}
	defer file.Close()

	// 简化的环境变量加载逻辑
	// 实际项目中应该使用更完整的env加载逻辑
}
