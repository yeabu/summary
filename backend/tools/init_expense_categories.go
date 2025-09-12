package main

import (
	"bufio"
	"log"
	"os"
	"strings"

	"../models"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// 从.env文件加载环境变量
func loadEnv() {
	file, err := os.Open("../.env")
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if os.Getenv(key) == "" {
				os.Setenv(key, value)
			}
		}
	}
}

// 初始化数据库连接
func initDB() *gorm.DB {
	loadEnv()

	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		log.Fatal("MYSQL_DSN env is required")
	}

	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("MySQL connect error: ", err)
	}

	return database
}

func main() {
	// 初始化数据库连接
	db := initDB()

	// 自动迁移费用类别模型
	db.AutoMigrate(&models.ExpenseCategory{})

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
		if err := db.Where("name = ?", category.Name).First(&existing).Error; err != nil {
			// 不存在则创建
			if err := db.Create(&category).Error; err != nil {
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
