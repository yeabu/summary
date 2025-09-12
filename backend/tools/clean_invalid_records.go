package main

import (
	"backend/db"
	"backend/models"
	"bufio"
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

func findInvalidExpenses() []models.BaseExpense {
	var invalidExpenses []models.BaseExpense

	// 查找各种无效的基地开支记录
	db.DB.Where(
		"base = '' OR base IS NULL OR " +
			"category = '' OR category IS NULL OR " +
			"amount <= 0 OR " +
			"detail = '' OR detail IS NULL OR " +
			"detail LIKE '%test%' OR " +
			"detail LIKE '%TEST%' OR " +
			"detail LIKE '%测试%' OR " +
			"category LIKE '%?%' OR " +
			"base LIKE '%?%' OR " +
			"detail LIKE '%?%'",
	).Find(&invalidExpenses)

	return invalidExpenses
}

func findInvalidPurchases() []models.PurchaseEntry {
	var invalidPurchases []models.PurchaseEntry

	// 查找各种无效的采购记录
	db.DB.Where(
		"supplier = '' OR supplier IS NULL OR " +
			"order_number = '' OR order_number IS NULL OR " +
			"total_amount <= 0 OR " +
			"receiver = '' OR receiver IS NULL OR " +
			"base = '' OR base IS NULL OR " +
			"supplier LIKE '%test%' OR " +
			"supplier LIKE '%TEST%' OR " +
			"supplier LIKE '%测试%' OR " +
			"order_number LIKE '%test%' OR " +
			"order_number LIKE '%TEST%' OR " +
			"receiver LIKE '%test%' OR " +
			"receiver LIKE '%TEST%'",
	).Find(&invalidPurchases)

	return invalidPurchases
}

func cleanInvalidRecords() {
	fmt.Println("=== 查找并清理无效记录 ===")

	// 1. 检查基地开支记录
	invalidExpenses := findInvalidExpenses()
	fmt.Printf("发现 %d 条无效的基地开支记录:\n", len(invalidExpenses))

	for _, expense := range invalidExpenses {
		fmt.Printf("  ID:%d | 基地:%s | 类别:%s | 金额:%.2f | 详情:%s\n",
			expense.ID, expense.Base, expense.Category, expense.Amount, expense.Detail)
	}

	// 2. 检查采购记录
	invalidPurchases := findInvalidPurchases()
	fmt.Printf("\n发现 %d 条无效的采购记录:\n", len(invalidPurchases))

	for _, purchase := range invalidPurchases {
		fmt.Printf("  ID:%d | 供应商:%s | 订单号:%s | 总金额:%.2f | 接收人:%s | 基地:%s\n",
			purchase.ID, purchase.Supplier, purchase.OrderNumber, purchase.TotalAmount,
			purchase.Receiver, purchase.Base)
	}

	// 3. 询问用户是否删除
	if len(invalidExpenses) > 0 || len(invalidPurchases) > 0 {
		fmt.Print("\n是否删除这些无效记录？(y/N): ")
		var input string
		fmt.Scanln(&input)

		if strings.ToLower(input) == "y" || strings.ToLower(input) == "yes" {
			// 删除无效的基地开支记录
			if len(invalidExpenses) > 0 {
				var expenseIDs []uint
				for _, expense := range invalidExpenses {
					expenseIDs = append(expenseIDs, expense.ID)
				}

				result := db.DB.Where("id IN ?", expenseIDs).Delete(&models.BaseExpense{})
				fmt.Printf("✓ 已删除 %d 条无效的基地开支记录\n", result.RowsAffected)
			}

			// 删除无效的采购记录
			if len(invalidPurchases) > 0 {
				var purchaseIDs []uint
				for _, purchase := range invalidPurchases {
					purchaseIDs = append(purchaseIDs, purchase.ID)
				}

				// 先删除采购项目
				db.DB.Where("purchase_entry_id IN ?", purchaseIDs).Delete(&models.PurchaseEntryItem{})

				// 再删除采购记录
				result := db.DB.Where("id IN ?", purchaseIDs).Delete(&models.PurchaseEntry{})
				fmt.Printf("✓ 已删除 %d 条无效的采购记录\n", result.RowsAffected)
			}

			fmt.Println("无效记录清理完成！")
		} else {
			fmt.Println("取消删除操作")
		}
	} else {
		fmt.Println("✓ 未发现无效记录")
	}
}

func showDataSummary() {
	fmt.Println("\n=== 清理后数据统计 ===")

	var expenseCount, purchaseCount int64
	db.DB.Model(&models.BaseExpense{}).Count(&expenseCount)
	db.DB.Model(&models.PurchaseEntry{}).Count(&purchaseCount)

	fmt.Printf("基地开支记录总数: %d\n", expenseCount)
	fmt.Printf("采购记录总数: %d\n", purchaseCount)

	// 显示最新的记录样本
	fmt.Println("\n=== 最新5条基地开支记录 ===")
	var recentExpenses []models.BaseExpense
	db.DB.Order("created_at desc").Limit(5).Find(&recentExpenses)
	for _, expense := range recentExpenses {
		fmt.Printf("基地: %s | 类别: %s | 金额: %.2f | 详情: %s\n",
			expense.Base, expense.Category, expense.Amount, expense.Detail)
	}

	fmt.Println("\n=== 最新5条采购记录 ===")
	var recentPurchases []models.PurchaseEntry
	db.DB.Order("created_at desc").Limit(5).Find(&recentPurchases)
	for _, purchase := range recentPurchases {
		fmt.Printf("供应商: %s | 订单号: %s | 总金额: %.2f | 基地: %s\n",
			purchase.Supplier, purchase.OrderNumber, purchase.TotalAmount, purchase.Base)
	}

	// 数据质量检查
	fmt.Println("\n=== 数据质量检查 ===")

	// 检查剩余的问题记录
	remainingBadExpenses := findInvalidExpenses()
	remainingBadPurchases := findInvalidPurchases()

	fmt.Printf("剩余问题基地开支记录: %d\n", len(remainingBadExpenses))
	fmt.Printf("剩余问题采购记录: %d\n", len(remainingBadPurchases))

	if len(remainingBadExpenses) == 0 && len(remainingBadPurchases) == 0 {
		fmt.Println("✅ 数据质量检查通过，所有记录字段完整！")
	}
}

func main() {
	// 加载环境变量
	loadEnv()

	// 初始化数据库连接
	db.Init()

	fmt.Println("开始清理无效记录...")

	// 清理无效记录
	cleanInvalidRecords()

	// 显示清理后的数据统计
	showDataSummary()

	fmt.Println("\n数据清理完成！")
}
