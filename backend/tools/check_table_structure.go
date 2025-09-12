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
	fmt.Println("=== users表结构 ===")
	rows, err := db.Query("DESCRIBE users")
	if err != nil {
		log.Fatal("查询users表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, dataType, null, key, defaultValue, extra sql.NullString
		err := rows.Scan(&field, &dataType, &null, &key, &defaultValue, &extra)
		if err != nil {
			log.Fatal("扫描users表结构失败:", err)
		}
		fmt.Printf("%s %s %s %s %s %s\n",
			field.String,
			dataType.String,
			null.String,
			key.String,
			defaultValue.String,
			extra.String)
	}

	// 检查base_expenses表结构
	fmt.Println("\n=== base_expenses表结构 ===")
	rows, err = db.Query("DESCRIBE base_expenses")
	if err != nil {
		log.Fatal("查询base_expenses表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, dataType, null, key, defaultValue, extra sql.NullString
		err := rows.Scan(&field, &dataType, &null, &key, &defaultValue, &extra)
		if err != nil {
			log.Fatal("扫描base_expenses表结构失败:", err)
		}
		fmt.Printf("%s %s %s %s %s %s\n",
			field.String,
			dataType.String,
			null.String,
			key.String,
			defaultValue.String,
			extra.String)
	}

	// 检查purchase_entries表结构
	fmt.Println("\n=== purchase_entries表结构 ===")
	rows, err = db.Query("DESCRIBE purchase_entries")
	if err != nil {
		log.Fatal("查询purchase_entries表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, dataType, null, key, defaultValue, extra sql.NullString
		err := rows.Scan(&field, &dataType, &null, &key, &defaultValue, &extra)
		if err != nil {
			log.Fatal("扫描purchase_entries表结构失败:", err)
		}
		fmt.Printf("%s %s %s %s %s %s\n",
			field.String,
			dataType.String,
			null.String,
			key.String,
			defaultValue.String,
			extra.String)
	}

	// 检查payable_records表结构
	fmt.Println("\n=== payable_records表结构 ===")
	rows, err = db.Query("DESCRIBE payable_records")
	if err != nil {
		log.Fatal("查询payable_records表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, dataType, null, key, defaultValue, extra sql.NullString
		err := rows.Scan(&field, &dataType, &null, &key, &defaultValue, &extra)
		if err != nil {
			log.Fatal("扫描payable_records表结构失败:", err)
		}
		fmt.Printf("%s %s %s %s %s %s\n",
			field.String,
			dataType.String,
			null.String,
			key.String,
			defaultValue.String,
			extra.String)
	}

	// 检查bases表结构
	fmt.Println("\n=== bases表结构 ===")
	rows, err = db.Query("DESCRIBE bases")
	if err != nil {
		log.Fatal("查询bases表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, dataType, null, key, defaultValue, extra sql.NullString
		err := rows.Scan(&field, &dataType, &null, &key, &defaultValue, &extra)
		if err != nil {
			log.Fatal("扫描bases表结构失败:", err)
		}
		fmt.Printf("%s %s %s %s %s %s\n",
			field.String,
			dataType.String,
			null.String,
			key.String,
			defaultValue.String,
			extra.String)
	}
}
