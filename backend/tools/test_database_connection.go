package main

import (
	"backend/db"
	"backend/models"
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
)

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

func main() {
	// 加载环境变量
	loadEnv()

	// 初始化数据库连接
	db.Init()

	fmt.Println("=== 数据库连接测试 ===")

	// 测试数据库连接
	sqlDB, err := db.DB.DB()
	if err != nil {
		log.Fatal("获取数据库连接失败:", err)
	}

	if err := sqlDB.Ping(); err != nil {
		log.Fatal("数据库连接测试失败:", err)
	}

	fmt.Println("✓ 数据库连接正常")

	fmt.Println("\n=== 基地开支记录查询测试 ===")

	// 查询所有基地开支记录
	var expenses []models.BaseExpense
	result := db.DB.Order("created_at desc").Limit(5).Find(&expenses)

	if result.Error != nil {
		log.Fatal("查询基地开支记录失败:", result.Error)
	}

	fmt.Printf("查询到 %d 条记录（最新5条）\n", len(expenses))

	if len(expenses) == 0 {
		fmt.Println("⚠️  数据库中没有基地开支记录")

		// 尝试查询表是否存在
		var tableExists bool
		db.DB.Raw("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'base_expenses')").Scan(&tableExists)

		if !tableExists {
			fmt.Println("⚠️  base_expenses 表不存在，可能需要迁移数据库")
		}
	} else {
		fmt.Println("\n--- 记录详情 ---")
		for i, expense := range expenses {
			fmt.Printf("\n记录 %d:\n", i+1)
			fmt.Printf("  ID: %d\n", expense.ID)
			fmt.Printf("  基地: %s\n", expense.Base)
			fmt.Printf("  日期: %s\n", expense.Date.Format("2006-01-02"))
			fmt.Printf("  类别: %s\n", expense.Category)
			fmt.Printf("  金额: %.2f\n", expense.Amount)
			fmt.Printf("  详情: %s\n", expense.Detail)
			fmt.Printf("  创建人: %d (%s)\n", expense.CreatedBy, expense.CreatorName)
			fmt.Printf("  创建时间: %s\n", expense.CreatedAt.Format("2006-01-02 15:04:05"))
		}

		fmt.Println("\n--- JSON序列化测试 ---")
		// 测试JSON序列化
		jsonData, err := json.MarshalIndent(expenses, "", "  ")
		if err != nil {
			log.Fatal("JSON序列化失败:", err)
		}

		fmt.Println("JSON序列化结果:")
		fmt.Println(string(jsonData))
	}

	// 统计总记录数
	var totalCount int64
	db.DB.Model(&models.BaseExpense{}).Count(&totalCount)
	fmt.Printf("\n总记录数: %d\n", totalCount)

	fmt.Println("\n=== 测试完成 ===")
}
