package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// 使用硬编码的数据库连接信息
	dsn := "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"
	fmt.Printf("使用数据库连接: %s\n", dsn)

	// 连接数据库
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("数据库连接失败: ", err)
	}
	defer db.Close()

	// 检查连接
	err = db.Ping()
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}
	fmt.Println("数据库连接成功!")

	// 检查base_expenses表结构
	fmt.Println("\n=== 检查base_expenses表结构 ===")
	checkTableStructure(db)

	// 检查数据状态
	fmt.Println("\n=== 检查数据状态 ===")
	checkDataStatus(db)

	// 检查外键约束
	fmt.Println("\n=== 检查外键约束 ===")
	checkForeignKeyConstraints(db)
}

func checkTableStructure(db *sql.DB) {
	// 检查base_expenses表中的字段
	rows, err := db.Query(`
		SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
		FROM INFORMATION_SCHEMA.COLUMNS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND COLUMN_NAME IN ('category_id', 'category')
		ORDER BY COLUMN_NAME
	`)
	if err != nil {
		log.Printf("查询表结构失败: %v", err)
		return
	}
	defer rows.Close()

	fmt.Println("字段信息:")
	for rows.Next() {
		var columnName, columnType, isNullable string
		var columnDefault sql.NullString
		err := rows.Scan(&columnName, &columnType, &isNullable, &columnDefault)
		if err != nil {
			log.Printf("扫描字段信息失败: %v", err)
			continue
		}
		defaultValue := "NULL"
		if columnDefault.Valid {
			defaultValue = columnDefault.String
		}
		fmt.Printf("  字段名: %s, 类型: %s, 可空: %s, 默认值: %s\n",
			columnName, columnType, isNullable, defaultValue)
	}

	// 检查索引
	indexRows, err := db.Query(`
		SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
		FROM INFORMATION_SCHEMA.STATISTICS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND COLUMN_NAME = 'category_id'
	`)
	if err != nil {
		log.Printf("查询索引信息失败: %v", err)
		return
	}
	defer indexRows.Close()

	fmt.Println("索引信息:")
	for indexRows.Next() {
		var indexName, columnName string
		var nonUnique int
		err := indexRows.Scan(&indexName, &columnName, &nonUnique)
		if err != nil {
			log.Printf("扫描索引信息失败: %v", err)
			continue
		}
		unique := "唯一"
		if nonUnique == 1 {
			unique = "非唯一"
		}
		fmt.Printf("  索引名: %s, 字段: %s, 类型: %s\n", indexName, columnName, unique)
	}
}

func checkDataStatus(db *sql.DB) {
	// 检查记录总数
	var totalRecords int
	err := db.QueryRow("SELECT COUNT(*) FROM base_expenses").Scan(&totalRecords)
	if err != nil {
		log.Printf("查询总记录数失败: %v", err)
		return
	}
	fmt.Printf("总记录数: %d\n", totalRecords)

	// 检查category_id值
	var recordsWithCategoryId, recordsWithoutCategoryId int
	err = db.QueryRow("SELECT COUNT(*) FROM base_expenses WHERE category_id IS NOT NULL").Scan(&recordsWithCategoryId)
	if err != nil {
		log.Printf("查询有category_id的记录数失败: %v", err)
		return
	}
	err = db.QueryRow("SELECT COUNT(*) FROM base_expenses WHERE category_id IS NULL").Scan(&recordsWithoutCategoryId)
	if err != nil {
		log.Printf("查询无category_id的记录数失败: %v", err)
		return
	}
	fmt.Printf("有category_id值的记录数: %d\n", recordsWithCategoryId)
	fmt.Printf("无category_id值的记录数: %d\n", recordsWithoutCategoryId)

	// 检查category字段（如果还存在）
	var recordsWithCategory, recordsWithoutCategory int
	err = db.QueryRow("SELECT COUNT(*) FROM base_expenses WHERE category IS NOT NULL AND category != ''").Scan(&recordsWithCategory)
	if err != nil {
		// category字段可能已被删除
		fmt.Println("category字段可能已被删除")
	} else {
		err = db.QueryRow("SELECT COUNT(*) FROM base_expenses WHERE category IS NULL OR category = ''").Scan(&recordsWithoutCategory)
		if err != nil {
			log.Printf("查询无category的记录数失败: %v", err)
			return
		}
		fmt.Printf("有category值的记录数: %d\n", recordsWithCategory)
		fmt.Printf("无category值的记录数: %d\n", recordsWithoutCategory)
	}

	// 显示类别统计
	fmt.Println("类别统计:")
	categoryRows, err := db.Query(`
		SELECT 
			ec.name as category_name,
			COUNT(be.id) as expense_count
		FROM expense_categories ec
		LEFT JOIN base_expenses be ON be.category_id = ec.id
		GROUP BY ec.id, ec.name
		ORDER BY expense_count DESC
	`)
	if err != nil {
		log.Printf("查询类别统计失败: %v", err)
		return
	}
	defer categoryRows.Close()

	for categoryRows.Next() {
		var categoryName string
		var expenseCount int
		err := categoryRows.Scan(&categoryName, &expenseCount)
		if err != nil {
			log.Printf("扫描类别统计失败: %v", err)
			continue
		}
		fmt.Printf("  %s: %d 条记录\n", categoryName, expenseCount)
	}
}

func checkForeignKeyConstraints(db *sql.DB) {
	// 检查外键约束
	fkRows, err := db.Query(`
		SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND REFERENCED_TABLE_NAME IS NOT NULL
		AND COLUMN_NAME = 'category_id'
	`)
	if err != nil {
		log.Printf("查询外键约束失败: %v", err)
		return
	}
	defer fkRows.Close()

	if !fkRows.Next() {
		fmt.Println("⚠️ 未找到 category_id 字段的外键约束")
		return
	}

	// 重新开始遍历
	fkRows, err = db.Query(`
		SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND REFERENCED_TABLE_NAME IS NOT NULL
		AND COLUMN_NAME = 'category_id'
	`)
	if err != nil {
		log.Printf("查询外键约束失败: %v", err)
		return
	}
	defer fkRows.Close()

	fmt.Println("外键约束信息:")
	for fkRows.Next() {
		var constraintName, columnName, referencedTable, referencedColumn string
		err := fkRows.Scan(&constraintName, &columnName, &referencedTable, &referencedColumn)
		if err != nil {
			log.Printf("扫描外键约束信息失败: %v", err)
			continue
		}
		fmt.Printf("  约束名: %s, 字段: %s -> %s.%s\n",
			constraintName, columnName, referencedTable, referencedColumn)
	}
}
