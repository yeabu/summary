package main

import (
	"backend/db"
	"backend/models"
	"encoding/json"
	"fmt"
	"log"
)

type ExpenseStat struct {
	Base     string  `json:"base"`
	Category string  `json:"category"`
	Month    string  `json:"month"`
	Total    float64 `json:"total"`
}

func main() {
	// 初始化数据库
	db.Init()

	fmt.Println("=== 调试统计API查询 ===")

	month := "2025-08"

	// 1. 检查原始数据
	var expenses []models.BaseExpense
	db.DB.Where("date >= ? AND date < ?", month+"-01", month+"-32").
		Order("date desc").Find(&expenses)

	fmt.Printf("2025-08月份原始数据 (共%d条):\n", len(expenses))
	for i, exp := range expenses {
		if i < 5 { // 只显示前5条
			fmt.Printf("  日期: %s, 基地: %s, 类别: %s, 金额: %.2f\n",
				exp.Date.Format("2006-01-02"), exp.Base, exp.Category, exp.Amount)
		}
	}

	// 2. 测试不同的SQL查询方式
	fmt.Println("\n=== 测试SQL查询 ===")

	// 方法1: 使用原始SQL查询来调试
	var sqlResult []map[string]interface{}
	sqlQuery := "SELECT base, category, DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as total FROM base_expenses WHERE date >= ? AND date < ? GROUP BY base, category, DATE_FORMAT(date, '%Y-%m') ORDER BY base, category"

	if err := db.DB.Raw(sqlQuery, month+"-01", month+"-32").Scan(&sqlResult).Error; err != nil {
		log.Printf("原始SQL查询失败: %v", err)
	} else {
		fmt.Printf("原始SQL查询结果: %d条\n", len(sqlResult))
		for i, row := range sqlResult {
			if i < 3 { // 只显示前3条
				fmt.Printf("  %v\n", row)
			}
		}
	}

	// 方法2: 分步调试GORM查询
	fmt.Println("\n=== GORM查询调试 ===")

	// 先测试基本查询
	baseQuery := db.DB.Model(&models.BaseExpense{}).Where("date >= ? AND date < ?", month+"-01", month+"-32")

	var countResult int64
	baseQuery.Count(&countResult)
	fmt.Printf("基础查询记录数: %d\n", countResult)

	// 测试选择语句
	selectQuery := baseQuery.Select("base, category, DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as total")

	// 添加分组
	groupQuery := selectQuery.Group("base, category, month").Order("base, category")

	// 执行查询
	var result []ExpenseStat
	if err := groupQuery.Scan(&result).Error; err != nil {
		log.Printf("GORM查询失败: %v", err)
	} else {
		fmt.Printf("GORM查询结果: %d条\n", len(result))
		if len(result) > 0 {
			jsonBytes, _ := json.MarshalIndent(result[:min(3, len(result))], "", "  ")
			fmt.Printf("前几条结果:\n%s\n", string(jsonBytes))
		}
	}

	// 方法3: 检查数据库表结构
	fmt.Println("\n=== 检查表结构 ===")
	var tables []string
	db.DB.Raw("SHOW TABLES").Scan(&tables)
	fmt.Printf("数据库表: %v\n", tables)

	// 检查base_expenses表结构
	var columns []map[string]interface{}
	db.DB.Raw("DESCRIBE base_expenses").Scan(&columns)
	fmt.Println("base_expenses表结构:")
	for _, col := range columns {
		fmt.Printf("  %v\n", col)
	}

	// 方法4: 直接查询几条记录看看DATE_FORMAT的结果
	fmt.Println("\n=== 测试DATE_FORMAT函数 ===")
	var dateFormatTest []map[string]interface{}
	db.DB.Raw("SELECT date, DATE_FORMAT(date, '%Y-%m') as formatted_month FROM base_expenses WHERE date >= ? AND date < ? LIMIT 5", month+"-01", month+"-32").Scan(&dateFormatTest)

	fmt.Println("DATE_FORMAT测试结果:")
	for _, row := range dateFormatTest {
		fmt.Printf("  原始日期: %v, 格式化月份: %v\n", row["date"], row["formatted_month"])
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
