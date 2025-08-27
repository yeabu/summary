package main

import (
	"fmt"
	"os"
	"backend/db"
	"backend/models"
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

	fmt.Println("=== 数据库数据统计 ===")
	
	// 统计用户数量
	var userCount int64
	db.DB.Model(&models.User{}).Count(&userCount)
	fmt.Printf("用户总数: %d\n", userCount)
	
	// 统计采购记录数量
	var purchaseCount int64
	db.DB.Model(&models.PurchaseEntry{}).Count(&purchaseCount)
	fmt.Printf("采购记录总数: %d\n", purchaseCount)
	
	// 统计费用记录数量
	var expenseCount int64
	db.DB.Model(&models.BaseExpense{}).Count(&expenseCount)
	fmt.Printf("费用记录总数: %d\n", expenseCount)
	
	fmt.Println("\n=== 用户列表 ===")
	var users []models.User
	db.DB.Select("id, name, role, base").Find(&users)
	for _, user := range users {
		fmt.Printf("ID: %d, 名称: %s, 角色: %s, 基地: %s\n", 
			user.ID, user.Name, user.Role, user.Base)
	}
	
	fmt.Println("\n=== 最近5条采购记录 ===")
	var purchases []models.PurchaseEntry
	db.DB.Order("created_at desc").Limit(5).Find(&purchases)
	for _, purchase := range purchases {
		fmt.Printf("ID: %d, 供应商: %s, 订单号: %s, 总金额: %.2f\n", 
			purchase.ID, purchase.Supplier, purchase.OrderNumber, purchase.TotalAmount)
	}
	
	fmt.Println("\n=== 最近5条费用记录 ===")
	var expenses []models.BaseExpense
	db.DB.Order("created_at desc").Limit(5).Find(&expenses)
	for _, expense := range expenses {
		fmt.Printf("ID: %d, 基地: %s, 类别: %s, 金额: %.2f, 详情: %s\n", 
			expense.ID, expense.Base, expense.Category, expense.Amount, expense.Detail)
	}
	
	fmt.Println("\n=== 按基地统计费用 ===")
	type BaseStat struct {
		Base  string
		Total float64
		Count int64
	}
	var baseStats []BaseStat
	db.DB.Model(&models.BaseExpense{}).
		Select("base, SUM(amount) as total, COUNT(*) as count").
		Group("base").
		Scan(&baseStats)
	
	for _, stat := range baseStats {
		fmt.Printf("%s: %.2f元 (%d条记录)\n", stat.Base, stat.Total, stat.Count)
	}
	
	fmt.Println("\n数据导入验证完成！")
}