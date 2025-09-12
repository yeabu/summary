package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// 连接数据库
	db, err := sql.Open("mysql", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 检查连接
	err = db.Ping()
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	// 检查users表结构
	fmt.Println("=== Users表结构 ===")
	rows, err := db.Query("DESCRIBE users")
	if err != nil {
		log.Fatal("查询users表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, typ, null, key string
		var def sql.NullString
		var extra string
		err := rows.Scan(&field, &typ, &null, &key, &def, &extra)
		if err != nil {
			log.Fatal(err)
		}
		defaultValue := "NULL"
		if def.Valid {
			defaultValue = def.String
		}
		fmt.Printf("%s %s %s %s %s %s\n", field, typ, null, key, defaultValue, extra)
	}

	// 检查bases表结构
	fmt.Println("\n=== Bases表结构 ===")
	rows, err = db.Query("DESCRIBE bases")
	if err != nil {
		log.Fatal("查询bases表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, typ, null, key string
		var def sql.NullString
		var extra string
		err := rows.Scan(&field, &typ, &null, &key, &def, &extra)
		if err != nil {
			log.Fatal(err)
		}
		defaultValue := "NULL"
		if def.Valid {
			defaultValue = def.String
		}
		fmt.Printf("%s %s %s %s %s %s\n", field, typ, null, key, defaultValue, extra)
	}

	// 检查base_expenses表结构
	fmt.Println("\n=== BaseExpenses表结构 ===")
	rows, err = db.Query("DESCRIBE base_expenses")
	if err != nil {
		log.Fatal("查询base_expenses表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, typ, null, key string
		var def sql.NullString
		var extra string
		err := rows.Scan(&field, &typ, &null, &key, &def, &extra)
		if err != nil {
			log.Fatal(err)
		}
		defaultValue := "NULL"
		if def.Valid {
			defaultValue = def.String
		}
		fmt.Printf("%s %s %s %s %s %s\n", field, typ, null, key, defaultValue, extra)
	}

	// 检查purchase_entries表结构
	fmt.Println("\n=== PurchaseEntries表结构 ===")
	rows, err = db.Query("DESCRIBE purchase_entries")
	if err != nil {
		log.Fatal("查询purchase_entries表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, typ, null, key string
		var def sql.NullString
		var extra string
		err := rows.Scan(&field, &typ, &null, &key, &def, &extra)
		if err != nil {
			log.Fatal(err)
		}
		defaultValue := "NULL"
		if def.Valid {
			defaultValue = def.String
		}
		fmt.Printf("%s %s %s %s %s %s\n", field, typ, null, key, defaultValue, extra)
	}

	// 检查payable_records表结构
	fmt.Println("\n=== PayableRecords表结构 ===")
	rows, err = db.Query("DESCRIBE payable_records")
	if err != nil {
		log.Fatal("查询payable_records表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, typ, null, key string
		var def sql.NullString
		var extra string
		err := rows.Scan(&field, &typ, &null, &key, &def, &extra)
		if err != nil {
			log.Fatal(err)
		}
		defaultValue := "NULL"
		if def.Valid {
			defaultValue = def.String
		}
		fmt.Printf("%s %s %s %s %s %s\n", field, typ, null, key, defaultValue, extra)
	}

	// 检查suppliers表结构
	fmt.Println("\n=== Suppliers表结构 ===")
	rows, err = db.Query("DESCRIBE suppliers")
	if err != nil {
		log.Fatal("查询suppliers表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, typ, null, key string
		var def sql.NullString
		var extra string
		err := rows.Scan(&field, &typ, &null, &key, &def, &extra)
		if err != nil {
			log.Fatal(err)
		}
		defaultValue := "NULL"
		if def.Valid {
			defaultValue = def.String
		}
		fmt.Printf("%s %s %s %s %s %s\n", field, typ, null, key, defaultValue, extra)
	}
}
