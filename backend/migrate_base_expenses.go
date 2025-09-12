package main

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
	"os"
)

func main() {
	fmt.Println("开始迁移base_expenses表结构...")

	// 加载环境变量
	loadEnv()

	// 初始化数据库
	db.Init()

	// 自动迁移新的模型结构
	fmt.Println("执行自动迁移...")
	if err := db.DB.AutoMigrate(&models.ExpenseCategory{}, &models.BaseExpense{}); err != nil {
		log.Fatalf("自动迁移失败: %v", err)
	}

	fmt.Println("迁移完成!")
	fmt.Println("现在base_expenses表使用category_id外键关联expense_categories表")
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
