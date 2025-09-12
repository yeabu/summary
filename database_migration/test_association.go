package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Base struct {
	ID          uint   `gorm:"primaryKey"`
	Name        string `gorm:"unique;not null"`
	Code        string `gorm:"unique;not null"`
	Location    string
	Description string
	Status      string `gorm:"default:active"`
	CreatedBy   uint
}

type BaseExpense struct {
	ID          uint `gorm:"primaryKey"`
	BaseID      uint `gorm:"not null"`
	Base        Base `gorm:"foreignKey:BaseID"`
	Date        time.Time
	Category    string
	Amount      float64
	Detail      string
	CreatedBy   uint
	CreatorName string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type PurchaseEntry struct {
	ID           uint `gorm:"primaryKey"`
	Supplier     string
	OrderNumber  string
	PurchaseDate time.Time
	TotalAmount  float64
	Receiver     string
	BaseID       uint `gorm:"not null"`
	Base         Base `gorm:"foreignKey:BaseID"`
	CreatedBy    uint
	CreatorName  string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Items        []PurchaseEntryItem `gorm:"foreignKey:PurchaseEntryID"`
}

type PurchaseEntryItem struct {
	ID              uint `gorm:"primaryKey"`
	PurchaseEntryID uint
	ProductName     string
	Quantity        float64
	UnitPrice       float64
	Amount          float64
}

var DB *gorm.DB

func main() {
	// 获取数据库连接信息
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		fmt.Print("请输入MySQL连接字符串 (例: root:password@tcp(localhost:3306)/summary?charset=utf8mb4&parseTime=True&loc=Local): ")
		reader := bufio.NewReader(os.Stdin)
		dsn, _ = reader.ReadString('\n')
		dsn = strings.TrimSpace(dsn)
	} else {
		fmt.Printf("使用环境变量中的数据库连接: %s\n", dsn)
	}

	// 初始化数据库连接
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("数据库连接失败: ", err)
	}

	fmt.Println("开始测试数据库关联查询功能...")

	// 1. 测试Base表数据
	if err := testBaseData(); err != nil {
		log.Fatal("测试Base表失败:", err)
	}

	// 2. 测试BaseExpense关联查询
	if err := testBaseExpenseQuery(); err != nil {
		log.Fatal("测试BaseExpense关联查询失败:", err)
	}

	// 3. 测试PurchaseEntry关联查询
	if err := testPurchaseEntryQuery(); err != nil {
		log.Fatal("测试PurchaseEntry关联查询失败:", err)
	}

	// 4. 测试创建新记录
	if err := testCreateRecord(); err != nil {
		log.Fatal("测试创建新记录失败:", err)
	}

	fmt.Println("所有测试完成！数据库关联查询功能正常。")
}

func testBaseData() error {
	fmt.Println("\n=== 测试Base表数据 ===")

	var bases []Base
	err := DB.Find(&bases).Error
	if err != nil {
		return fmt.Errorf("查询Base表失败: %v", err)
	}

	fmt.Printf("Base表共有 %d 条记录:\n", len(bases))
	for _, base := range bases {
		fmt.Printf("- ID: %d, Name: %s, Code: %s, Status: %s\n",
			base.ID, base.Name, base.Code, base.Status)
	}

	return nil
}

func testBaseExpenseQuery() error {
	fmt.Println("\n=== 测试BaseExpense关联查询 ===")

	// 查询带关联的BaseExpense记录
	var expenses []BaseExpense
	err := DB.Preload("Base").Limit(10).Find(&expenses).Error
	if err != nil {
		return fmt.Errorf("查询BaseExpense失败: %v", err)
	}

	fmt.Printf("BaseExpense表共查询到 %d 条记录 (显示前10条):\n", len(expenses))
	for _, expense := range expenses {
		fmt.Printf("- ID: %d, BaseID: %d, Base: %s, Category: %s, Amount: %.2f, Date: %s\n",
			expense.ID, expense.BaseID, expense.Base.Name, expense.Category,
			expense.Amount, expense.Date.Format("2006-01-02"))
	}

	// 测试统计查询
	var stats []struct {
		BaseName string  `json:"base_name"`
		Category string  `json:"category"`
		Total    float64 `json:"total"`
		Count    int64   `json:"count"`
	}

	err = DB.Table("base_expenses").
		Select("bases.name as base_name, base_expenses.category, SUM(base_expenses.amount) as total, COUNT(*) as count").
		Joins("LEFT JOIN bases ON bases.id = base_expenses.base_id").
		Group("bases.name, base_expenses.category").
		Order("bases.name, base_expenses.category").
		Limit(5).
		Scan(&stats).Error

	if err != nil {
		return fmt.Errorf("统计查询失败: %v", err)
	}

	fmt.Printf("\n基地费用统计 (显示前5条):\n")
	for _, stat := range stats {
		fmt.Printf("- %s - %s: %.2f元 (%d笔)\n",
			stat.BaseName, stat.Category, stat.Total, stat.Count)
	}

	return nil
}

func testPurchaseEntryQuery() error {
	fmt.Println("\n=== 测试PurchaseEntry关联查询 ===")

	// 查询带关联的PurchaseEntry记录
	var purchases []PurchaseEntry
	err := DB.Preload("Base").Preload("Items").Limit(5).Find(&purchases).Error
	if err != nil {
		return fmt.Errorf("查询PurchaseEntry失败: %v", err)
	}

	fmt.Printf("PurchaseEntry表共查询到 %d 条记录 (显示前5条):\n", len(purchases))
	for _, purchase := range purchases {
		fmt.Printf("- ID: %d, BaseID: %d, Base: %s, Supplier: %s, TotalAmount: %.2f, Date: %s\n",
			purchase.ID, purchase.BaseID, purchase.Base.Name, purchase.Supplier,
			purchase.TotalAmount, purchase.PurchaseDate.Format("2006-01-02"))

		if len(purchase.Items) > 0 {
			fmt.Printf("  采购明细 (%d项):\n", len(purchase.Items))
			for _, item := range purchase.Items {
				fmt.Printf("    - %s: %.2f x %.2f = %.2f\n",
					item.ProductName, item.Quantity, item.UnitPrice, item.Amount)
			}
		}
	}

	return nil
}

func testCreateRecord() error {
	fmt.Println("\n=== 测试创建新记录 ===")

	// 查找第一个可用的基地
	var firstBase Base
	err := DB.First(&firstBase).Error
	if err != nil {
		return fmt.Errorf("未找到可用基地: %v", err)
	}

	// 创建测试费用记录
	testExpense := BaseExpense{
		BaseID:      firstBase.ID,
		Date:        time.Now(),
		Category:    "测试类别",
		Amount:      100.00,
		Detail:      "数据库迁移测试记录",
		CreatedBy:   1,
		CreatorName: "系统测试",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err = DB.Create(&testExpense).Error
	if err != nil {
		return fmt.Errorf("创建测试费用记录失败: %v", err)
	}

	fmt.Printf("成功创建测试费用记录 ID: %d (BaseID: %d)\n", testExpense.ID, testExpense.BaseID)

	// 验证创建的记录可以正确关联查询
	var verifyExpense BaseExpense
	err = DB.Preload("Base").First(&verifyExpense, testExpense.ID).Error
	if err != nil {
		return fmt.Errorf("查询创建的记录失败: %v", err)
	}

	fmt.Printf("验证记录: ID: %d, Base: %s, Category: %s, Amount: %.2f\n",
		verifyExpense.ID, verifyExpense.Base.Name, verifyExpense.Category, verifyExpense.Amount)

	// 清理测试记录
	DB.Delete(&testExpense)
	fmt.Println("已清理测试记录")

	return nil
}
