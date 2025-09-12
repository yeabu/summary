package main

import (
	"backend/db"
	"backend/models"
	"encoding/json"
	"fmt"
	"os"
)

func main() {
	// 设置环境变量
	if os.Getenv("MYSQL_DSN") == "" {
		os.Setenv("MYSQL_DSN", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local")
	}
	if os.Getenv("JWT_SECRET") == "" {
		os.Setenv("JWT_SECRET", "REPLACE_THIS_WITH_YOUR_SECRET")
	}

	// 初始化数据库连接
	db.Init()

	// 检查基地数据
	fmt.Println("=== 基地数据检查 ===")
	var bases []models.Base
	result := db.DB.Find(&bases)
	if result.Error != nil {
		fmt.Printf("查询基地数据失败: %v\n", result.Error)
		return
	}
	fmt.Printf("找到 %d 个基地:\n", len(bases))
	for _, base := range bases {
		fmt.Printf("  ID: %d, 名称: %s\n", base.ID, base.Name)
	}

	// 检查管理员用户
	fmt.Println("\n=== 管理员用户检查 ===")
	var adminUser models.User
	result = db.DB.Where("role = ?", "admin").First(&adminUser)
	if result.Error != nil {
		fmt.Printf("查询管理员用户失败: %v\n", result.Error)
		return
	}
	fmt.Printf("管理员用户: ID=%d, 名称=%s, 角色=%s\n", adminUser.ID, adminUser.Name, adminUser.Role)

	// 检查采购记录结构
	fmt.Println("\n=== 采购记录结构检查 ===")
	purchase := models.PurchaseEntry{}
	fmt.Printf("模型类型: %T\n", purchase)
	fmt.Printf("ID字段: %v\n", purchase.ID)
	fmt.Printf("SupplierID字段: %v\n", purchase.SupplierID)
	fmt.Printf("OrderNumber字段: %v\n", purchase.OrderNumber)
	fmt.Printf("PurchaseDate字段: %v\n", purchase.PurchaseDate)
	fmt.Printf("TotalAmount字段: %v\n", purchase.TotalAmount)
	fmt.Printf("Receiver字段: %v\n", purchase.Receiver)
	fmt.Printf("BaseID字段: %v\n", purchase.BaseID)
	fmt.Printf("CreatedBy字段: %v\n", purchase.CreatedBy)
	fmt.Printf("CreatorName字段: %v\n", purchase.CreatorName)

	// 创建测试采购记录（模拟管理员操作）
	fmt.Println("\n=== 创建测试采购记录 ===")
	if len(bases) > 0 {
		testBase := bases[0] // 使用第一个基地作为测试
		fmt.Printf("使用基地: ID=%d, 名称=%s\n", testBase.ID, testBase.Name)

		// 模拟管理员创建采购记录的请求数据
		requestData := map[string]interface{}{
			"supplier_id":   nil,
			"order_number":  "TEST-001",
			"purchase_date": "2025-08-29",
			"total_amount":  1000.0,
			"receiver":      "测试收货人",
			"base_id":       testBase.ID, // 管理员指定基地ID
			"items": []map[string]interface{}{
				{
					"product_name": "测试商品",
					"quantity":     10.0,
					"unit_price":   100.0,
					"amount":       1000.0,
				},
			},
		}

		// 输出请求数据
		jsonData, _ := json.MarshalIndent(requestData, "", "  ")
		fmt.Printf("请求数据:\n%s\n", jsonData)

		// 验证基地ID是否有效
		if requestData["base_id"].(uint) == 0 {
			fmt.Println("错误: 基地ID不能为0")
		} else {
			fmt.Printf("基地ID验证通过: %d\n", requestData["base_id"])
		}
	} else {
		fmt.Println("错误: 没有可用的基地数据")
	}

	fmt.Println("\n=== 测试完成 ===")
}
