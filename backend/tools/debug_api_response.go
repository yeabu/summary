package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// BaseExpense 开支记录结构
type BaseExpense struct {
	ID          uint    `gorm:"primaryKey" json:"id"`
	Date        string  `json:"date"`
	Category    string  `json:"category"`
	Amount      float64 `json:"amount"`
	Base        string  `json:"base"`
	CreatorName string  `json:"creator_name"`
	Detail      string  `json:"detail"`
}

// Purchase 采购记录结构
type Purchase struct {
	ID           uint    `gorm:"primaryKey" json:"id"`
	PurchaseDate string  `json:"purchase_date"`
	Supplier     string  `json:"supplier"`
	OrderNumber  string  `json:"order_number"`
	Base         string  `json:"base"`
	TotalAmount  float64 `json:"total_amount"`
	Receiver     string  `json:"receiver"`
	CreatorName  string  `json:"creator_name"`
}

func main() {
	// 连接数据库
	db, err := gorm.Open(sqlite.Open("../summary.db"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatal("连接数据库失败:", err)
	}

	fmt.Println("=== 检查基地开支记录中的空/无效数据 ===")

	// 检查基地开支记录
	var expenses []BaseExpense
	db.Find(&expenses)

	fmt.Printf("总共找到 %d 条基地开支记录\n", len(expenses))

	emptyFieldCount := 0
	for i, expense := range expenses {
		hasEmptyFields := false
		emptyFields := []string{}

		if expense.Date == "" {
			emptyFields = append(emptyFields, "date")
			hasEmptyFields = true
		}
		if expense.Category == "" {
			emptyFields = append(emptyFields, "category")
			hasEmptyFields = true
		}
		if expense.Amount == 0 {
			emptyFields = append(emptyFields, "amount")
			hasEmptyFields = true
		}
		if expense.Base == "" {
			emptyFields = append(emptyFields, "base")
			hasEmptyFields = true
		}

		if hasEmptyFields {
			emptyFieldCount++
			fmt.Printf("记录 %d (ID: %d): 空字段 %v\n", i+1, expense.ID, emptyFields)
			expenseJSON, _ := json.MarshalIndent(expense, "", "  ")
			fmt.Printf("  完整记录: %s\n", string(expenseJSON))
		}
	}

	fmt.Printf("发现 %d 条有空字段的基地开支记录\n\n", emptyFieldCount)

	fmt.Println("=== 检查采购记录中的空/无效数据 ===")

	// 检查采购记录
	var purchases []Purchase
	db.Find(&purchases)

	fmt.Printf("总共找到 %d 条采购记录\n", len(purchases))

	emptyPurchaseCount := 0
	for i, purchase := range purchases {
		hasEmptyFields := false
		emptyFields := []string{}

		if purchase.PurchaseDate == "" {
			emptyFields = append(emptyFields, "purchase_date")
			hasEmptyFields = true
		}
		if purchase.Supplier == "" {
			emptyFields = append(emptyFields, "supplier")
			hasEmptyFields = true
		}
		if purchase.OrderNumber == "" {
			emptyFields = append(emptyFields, "order_number")
			hasEmptyFields = true
		}
		if purchase.Base == "" {
			emptyFields = append(emptyFields, "base")
			hasEmptyFields = true
		}
		if purchase.TotalAmount == 0 {
			emptyFields = append(emptyFields, "total_amount")
			hasEmptyFields = true
		}
		if purchase.Receiver == "" {
			emptyFields = append(emptyFields, "receiver")
			hasEmptyFields = true
		}

		if hasEmptyFields {
			emptyPurchaseCount++
			fmt.Printf("记录 %d (ID: %d): 空字段 %v\n", i+1, purchase.ID, emptyFields)
			purchaseJSON, _ := json.MarshalIndent(purchase, "", "  ")
			fmt.Printf("  完整记录: %s\n", string(purchaseJSON))
		}
	}

	fmt.Printf("发现 %d 条有空字段的采购记录\n\n", emptyPurchaseCount)

	// 模拟API调用测试
	fmt.Println("=== 模拟API响应测试 ===")
	testAPIResponse()
}

func testAPIResponse() {
	// 模拟调用本地API
	resp, err := http.Get("http://localhost:8080/api/expense/list")
	if err != nil {
		fmt.Printf("API调用失败: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		fmt.Printf("API返回错误状态码: %d\n", resp.StatusCode)
		return
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Printf("解析API响应失败: %v\n", err)
		return
	}

	fmt.Printf("API响应状态: %v\n", result["status"])

	if data, ok := result["data"].([]interface{}); ok {
		fmt.Printf("API返回数据条数: %d\n", len(data))

		// 检查前几条数据的完整性
		for i, item := range data {
			if i >= 5 { // 只检查前5条
				break
			}

			if itemMap, ok := item.(map[string]interface{}); ok {
				fmt.Printf("记录 %d: ", i+1)

				// 检查关键字段
				requiredFields := []string{"date", "category", "amount", "base"}
				allFieldsPresent := true

				for _, field := range requiredFields {
					if value, exists := itemMap[field]; !exists || value == nil || value == "" {
						allFieldsPresent = false
						fmt.Printf("缺少字段 %s ", field)
					}
				}

				if allFieldsPresent {
					fmt.Printf("✓ 数据完整")
				}
				fmt.Println()
			}
		}
	}
}
