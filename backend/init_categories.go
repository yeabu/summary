package main

import (
	"backend/db"
	"backend/models"
	"log"
)

func main() {
	// 初始化数据库连接
	db.Init()

	// 自动迁移费用类别模型
	db.DB.AutoMigrate(&models.ExpenseCategory{})

	// 定义默认费用类别
	defaultCategories := []models.ExpenseCategory{
		{Name: "伙食费", Code: "FOOD", Status: "active"},
		{Name: "修车费", Code: "REPAIR", Status: "active"},
		{Name: "电费", Code: "ELECTRICITY", Status: "active"},
		{Name: "加油费", Code: "FUEL", Status: "active"},
		{Name: "材料费", Code: "MATERIAL", Status: "active"},
	}

	// 创建默认费用类别
	for _, category := range defaultCategories {
		var existing models.ExpenseCategory
		// 检查是否已存在
		if err := db.DB.Where("name = ?", category.Name).First(&existing).Error; err != nil {
			// 不存在则创建
			if err := db.DB.Create(&category).Error; err != nil {
				log.Printf("创建费用类别 '%s' 失败: %v", category.Name, err)
			} else {
				log.Printf("成功创建费用类别: %s", category.Name)
			}
		} else {
			log.Printf("费用类别 '%s' 已存在", category.Name)
		}
	}

	log.Println("费用类别初始化完成")
}
