package main

import (
	"backend/db"
	"backend/models"
	"encoding/json"
	"fmt"
	"time"
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

	fmt.Println("=== 测试修复后的统计查询 ===")

	month := "2025-08"

	// 使用修复后的日期范围查询逻辑
	t, _ := time.Parse("2006-01", month)
	nextMonth := t.AddDate(0, 1, 0)
	startDate := month + "-01"
	endDate := nextMonth.Format("2006-01-02")

	fmt.Printf("查询月份: %s\n", month)
	fmt.Printf("开始日期: %s\n", startDate)
	fmt.Printf("结束日期: %s (不包含)\n", endDate)

	// 1. 先检查该月份是否有数据
	var count int64
	db.DB.Model(&models.BaseExpense{}).Where("date >= ? AND date < ?", startDate, endDate).Count(&count)
	fmt.Printf("2025-08月份费用记录总数: %d\n", count)

	// 2. 执行统计查询（使用修复后的逻辑）
	var result []ExpenseStat
	group := db.DB.Model(&models.BaseExpense{}).
		Select("base, category, DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as total").
		Where("date >= ? AND date < ?", startDate, endDate).
		Group("base, category, month").Order("base, category")

	if err := group.Scan(&result).Error; err != nil {
		fmt.Printf("统计查询失败: %v\n", err)
		return
	}

	fmt.Printf("\n=== 统计查询结果 ===\n")
	fmt.Printf("统计结果条数: %d\n", len(result))

	if len(result) > 0 {
		// 输出JSON格式的结果
		jsonBytes, _ := json.MarshalIndent(result, "", "  ")
		fmt.Printf("JSON格式结果:\n%s\n", string(jsonBytes))

		// 计算总金额
		var totalAmount float64
		for _, stat := range result {
			totalAmount += stat.Total
		}
		fmt.Printf("\n总金额: %.2f元\n", totalAmount)
	} else {
		fmt.Println("统计结果仍为空")
	}

	// 3. 测试其他月份
	fmt.Println("\n=== 测试其他月份 ===")
	testMonths := []string{"2024-08", "2025-07", "2025-06"}

	for _, testMonth := range testMonths {
		testT, _ := time.Parse("2006-01", testMonth)
		testNextMonth := testT.AddDate(0, 1, 0)
		testStartDate := testMonth + "-01"
		testEndDate := testNextMonth.Format("2006-01-02")

		var testResult []ExpenseStat
		testGroup := db.DB.Model(&models.BaseExpense{}).
			Select("base, category, DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as total").
			Where("date >= ? AND date < ?", testStartDate, testEndDate).
			Group("base, category, month").Order("base, category")

		testGroup.Scan(&testResult)
		fmt.Printf("月份 %s: %d条统计结果\n", testMonth, len(testResult))

		if len(testResult) > 0 {
			var testTotal float64
			for _, stat := range testResult {
				testTotal += stat.Total
			}
			fmt.Printf("  总金额: %.2f元\n", testTotal)
		}
	}
}
