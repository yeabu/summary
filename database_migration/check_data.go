package main

import (
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func main() {
	// 使用硬编码的数据库连接信息（从.env文件中获取）
	dsn := "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"
	fmt.Printf("使用数据库连接: %s\n", dsn)

	// 初始化数据库连接
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("数据库连接失败: ", err)
	}

	// 检查数据情况
	checkData()
}

func checkData() {
	fmt.Println("\n=== 检查数据情况 ===")

	// 显示所有expense_categories
	fmt.Println("expense_categories表中的所有记录:")
	var categories []map[string]interface{}
	err := DB.Raw("SELECT id, name, code FROM expense_categories").Scan(&categories).Error
	if err != nil {
		log.Printf("查询expense_categories失败: %v", err)
		return
	}

	for _, cat := range categories {
		fmt.Printf("  ID: %v, 名称: %s, 代码: %s\n", cat["id"], cat["name"], cat["code"])
	}

	// 检查base_expenses中的category_id值
	fmt.Println("\nbase_expenses表中category_id的值:")
	var categoryIds []map[string]interface{}
	err = DB.Raw("SELECT DISTINCT category_id, COUNT(*) as count FROM base_expenses GROUP BY category_id ORDER BY category_id").Scan(&categoryIds).Error
	if err != nil {
		log.Printf("查询base_expenses的category_id失败: %v", err)
		return
	}

	for _, cid := range categoryIds {
		fmt.Printf("  category_id: %v, 数量: %v\n", cid["category_id"], cid["count"])
	}

	// 检查无效的category_id值
	fmt.Println("\n检查无效的category_id值:")
	var invalidIds []map[string]interface{}
	err = DB.Raw(`
		SELECT be.id, be.category_id, be.detail
		FROM base_expenses be
		LEFT JOIN expense_categories ec ON be.category_id = ec.id
		WHERE ec.id IS NULL AND be.category_id IS NOT NULL
		LIMIT 10
	`).Scan(&invalidIds).Error
	if err != nil {
		log.Printf("查询无效的category_id失败: %v", err)
		return
	}

	if len(invalidIds) > 0 {
		fmt.Printf("发现 %d 条记录有无效的category_id值:\n", len(invalidIds))
		for _, record := range invalidIds {
			fmt.Printf("  记录ID: %v, category_id: %v, 详情: %s\n", record["id"], record["category_id"], record["detail"])
		}
	} else {
		fmt.Println("未发现无效的category_id值")
	}
}
