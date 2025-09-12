package main

import (
	"backend/db"
	"backend/models"
	"encoding/json"
	"fmt"
	"log"
	"os"
)

func main() {
	// 加载环境变量
	os.Setenv("MYSQL_DSN", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local")

	// 初始化数据库
	db.Init()

	fmt.Println("=== 测试数据库关联查询 ===")

	// 1. 测试获取费用记录（带基地关联）
	var expenses []models.BaseExpense
	err := db.DB.Preload("Base").Limit(5).Find(&expenses).Error
	if err != nil {
		log.Fatal("查询费用记录失败:", err)
	}

	fmt.Printf("\n费用记录 (显示前5条):\n")
	for _, expense := range expenses {
		data, _ := json.MarshalIndent(map[string]interface{}{
			"id":       expense.ID,
			"base_id":  expense.BaseID,
			"base":     expense.Base,
			"category": expense.Category,
			"amount":   expense.Amount,
			"detail":   expense.Detail,
		}, "", "  ")
		fmt.Println(string(data))
	}

	// 2. 测试获取采购记录（带基地关联）
	var purchases []models.PurchaseEntry
	err = db.DB.Preload("Base").Preload("Items").Limit(3).Find(&purchases).Error
	if err != nil {
		log.Fatal("查询采购记录失败:", err)
	}

	fmt.Printf("\n\n采购记录 (显示前3条):\n")
	for _, purchase := range purchases {
		data, _ := json.MarshalIndent(map[string]interface{}{
			"id":           purchase.ID,
			"base_id":      purchase.BaseID,
			"base":         purchase.Base,
			"supplier":     purchase.Supplier,
			"total_amount": purchase.TotalAmount,
			"items_count":  len(purchase.Items),
		}, "", "  ")
		fmt.Println(string(data))
	}

	// 3. 测试统计查询
	var stats []struct {
		BaseName string  `json:"base_name"`
		Category string  `json:"category"`
		Total    float64 `json:"total"`
		Count    int64   `json:"count"`
	}

	err = db.DB.Table("base_expenses").
		Select("bases.name as base_name, base_expenses.category, SUM(base_expenses.amount) as total, COUNT(*) as count").
		Joins("LEFT JOIN bases ON bases.id = base_expenses.base_id").
		Group("bases.name, base_expenses.category").
		Order("bases.name, base_expenses.category").
		Limit(10).
		Scan(&stats).Error

	if err != nil {
		log.Fatal("统计查询失败:", err)
	}

	fmt.Printf("\n\n费用统计 (显示前10条):\n")
	for _, stat := range stats {
		data, _ := json.MarshalIndent(stat, "", "  ")
		fmt.Println(string(data))
	}

	fmt.Println("\n=== 测试完成，数据库关联查询功能正常！ ===")
}
