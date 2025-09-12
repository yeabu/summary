package main

import (
	"backend/db"
	"backend/models"
	"fmt"
)

func main() {
	// 初始化数据库
	db.Init()

	fmt.Println("=== 查询所有费用记录 ===")

	var expenses []models.BaseExpense
	db.DB.Order("date desc").Find(&expenses)

	fmt.Printf("总记录数: %d\n\n", len(expenses))

	// 按月份统计
	monthCount := make(map[string]int)
	fmt.Println("前10条记录:")
	for i, exp := range expenses {
		if i < 10 {
			fmt.Printf("%d. 日期: %s, 基地: %s, 类别: %s, 金额: %.2f\n",
				i+1, exp.Date.Format("2006-01-02"), exp.Base, exp.Category, exp.Amount)
		}
		month := exp.Date.Format("2006-01")
		monthCount[month]++
	}

	fmt.Println("\n=== 按月份统计 ===")
	for month, count := range monthCount {
		fmt.Printf("月份: %s, 记录数: %d\n", month, count)
	}

	// 重点检查2025-08的数据
	fmt.Println("\n=== 2025-08月份的具体数据 ===")
	var august2025 []models.BaseExpense
	db.DB.Where("DATE(date) >= '2025-08-01' AND DATE(date) <= '2025-08-31'").Find(&august2025)

	fmt.Printf("2025-08月份记录数: %d\n", len(august2025))
	for i, exp := range august2025 {
		fmt.Printf("%d. 日期: %s, 基地: %s, 类别: %s, 金额: %.2f\n",
			i+1, exp.Date.Format("2006-01-02"), exp.Base, exp.Category, exp.Amount)
	}
}
