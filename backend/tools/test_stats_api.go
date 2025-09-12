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

	fmt.Println("=== 测试统计API数据查询 ===")

	// 测试查询2025-08月的数据
	month := "2025-08"
	fmt.Printf("查询月份: %s\n\n", month)

	// 1. 先检查该月份是否有数据
	var count int64
	db.DB.Model(&models.BaseExpense{}).Where("date >= ? AND date < ?", month+"-01", month+"-32").Count(&count)
	fmt.Printf("2025-08月份费用记录总数: %d\n", count)

	// 2. 查看该月份的原始数据
	var expenses []models.BaseExpense
	db.DB.Where("date >= ? AND date < ?", month+"-01", month+"-32").
		Order("date desc").Limit(10).Find(&expenses)

	fmt.Printf("\n=== 2025-08月份的费用记录 (前10条) ===\n")
	for _, exp := range expenses {
		fmt.Printf("日期: %s, 基地: %s, 类别: %s, 金额: %.2f, 详情: %s\n",
			exp.Date.Format("2006-01-02"), exp.Base, exp.Category, exp.Amount, exp.Detail)
	}

	// 3. 执行统计查询（模拟API的查询逻辑）
	var result []ExpenseStat
	group := db.DB.Model(&models.BaseExpense{}).
		Select("base, category, DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as total").
		Where("date >= ? AND date < ?", month+"-01", month+"-32")

	group = group.Group("base, category, month").Order("base, category")

	if err := group.Scan(&result).Error; err != nil {
		log.Fatal("统计查询失败:", err)
	}

	fmt.Printf("\n=== 统计API查询结果 ===\n")
	fmt.Printf("统计结果条数: %d\n", len(result))

	if len(result) == 0 {
		fmt.Println("统计结果为空 - 这就是为什么API返回null/空数组的原因！")

		// 检查所有月份的数据分布
		fmt.Println("\n=== 检查所有月份的数据分布 ===")
		var monthStats []struct {
			Month string `json:"month"`
			Count int64  `json:"count"`
		}

		db.DB.Model(&models.BaseExpense{}).
			Select("DATE_FORMAT(date, '%Y-%m') as month, COUNT(*) as count").
			Group("month").Order("month desc").
			Scan(&monthStats)

		for _, stat := range monthStats {
			fmt.Printf("月份: %s, 记录数: %d\n", stat.Month, stat.Count)
		}

	} else {
		// 输出JSON格式的结果
		jsonBytes, _ := json.MarshalIndent(result, "", "  ")
		fmt.Println("JSON格式结果:")
		fmt.Println(string(jsonBytes))
	}

	// 4. 测试其他月份
	fmt.Println("\n=== 测试其他月份 ===")
	testMonths := []string{"2024-08", "2024-12", "2025-01"}

	for _, testMonth := range testMonths {
		var testResult []ExpenseStat
		testGroup := db.DB.Model(&models.BaseExpense{}).
			Select("base, category, DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as total").
			Where("date >= ? AND date < ?", testMonth+"-01", testMonth+"-32").
			Group("base, category, month").Order("base, category")

		testGroup.Scan(&testResult)
		fmt.Printf("月份 %s: %d条统计结果\n", testMonth, len(testResult))

		if len(testResult) > 0 {
			fmt.Printf("  示例数据: 基地=%s, 类别=%s, 总额=%.2f\n",
				testResult[0].Base, testResult[0].Category, testResult[0].Total)
		}
	}
}
