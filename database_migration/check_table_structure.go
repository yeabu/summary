package main

import (
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func main() {
	// 获取数据库连接信息
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"
		fmt.Printf("使用默认数据库连接: %s\n", dsn)
	} else {
		fmt.Printf("使用环境变量中的数据库连接: %s\n", dsn)
	}

	// 初始化数据库连接
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("数据库连接失败: ", err)
	}

	fmt.Println("=== 检查表结构 ===")

	// 检查 base_expenses 表结构
	fmt.Println("\n--- base_expenses 表字段 ---")
	var expenseColumns []struct {
		Field   string      `db:"Field"`
		Type    string      `db:"Type"`
		Null    string      `db:"Null"`
		Key     string      `db:"Key"`
		Default interface{} `db:"Default"`
		Extra   string      `db:"Extra"`
	}

	err = DB.Raw("DESCRIBE base_expenses").Scan(&expenseColumns).Error
	if err != nil {
		log.Fatal("查询base_expenses表结构失败:", err)
	}

	for _, col := range expenseColumns {
		fmt.Printf("  %s: %s (Null: %s, Key: %s)\n", col.Field, col.Type, col.Null, col.Key)
	}

	// 检查 purchase_entries 表结构
	fmt.Println("\n--- purchase_entries 表字段 ---")
	var purchaseColumns []struct {
		Field   string      `db:"Field"`
		Type    string      `db:"Type"`
		Null    string      `db:"Null"`
		Key     string      `db:"Key"`
		Default interface{} `db:"Default"`
		Extra   string      `db:"Extra"`
	}

	err = DB.Raw("DESCRIBE purchase_entries").Scan(&purchaseColumns).Error
	if err != nil {
		log.Fatal("查询purchase_entries表结构失败:", err)
	}

	for _, col := range purchaseColumns {
		fmt.Printf("  %s: %s (Null: %s, Key: %s)\n", col.Field, col.Type, col.Null, col.Key)
	}

	// 检查数据一致性
	fmt.Println("\n=== 检查数据一致性 ===")

	// 检查 base_expenses 表
	var expenseInconsistent int64
	err = DB.Raw("SELECT COUNT(*) FROM base_expenses be LEFT JOIN bases b ON b.id = be.base_id WHERE be.base != b.name").Scan(&expenseInconsistent).Error
	if err == nil {
		fmt.Printf("base_expenses 表中 base 和 base_id 不一致的记录数: %d\n", expenseInconsistent)
	}

	// 检查 purchase_entries 表
	var purchaseInconsistent int64
	err = DB.Raw("SELECT COUNT(*) FROM purchase_entries pe LEFT JOIN bases b ON b.id = pe.base_id WHERE pe.base != b.name").Scan(&purchaseInconsistent).Error
	if err == nil {
		fmt.Printf("purchase_entries 表中 base 和 base_id 不一致的记录数: %d\n", purchaseInconsistent)
	}

	// 统计总记录数
	var expenseTotal, purchaseTotal int64
	DB.Raw("SELECT COUNT(*) FROM base_expenses").Scan(&expenseTotal)
	DB.Raw("SELECT COUNT(*) FROM purchase_entries").Scan(&purchaseTotal)

	fmt.Printf("\nbase_expenses 总记录数: %d\n", expenseTotal)
	fmt.Printf("purchase_entries 总记录数: %d\n", purchaseTotal)

	fmt.Println("\n=== 检查完成 ===")
}
