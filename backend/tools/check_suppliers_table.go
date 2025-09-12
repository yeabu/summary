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

	// 检查suppliers表结构
	fmt.Println("=== suppliers表结构 ===")
	rows, err := db.Query("DESCRIBE suppliers")
	if err != nil {
		log.Fatal("查询suppliers表结构失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var field, dataType, null, key, defaultValue, extra sql.NullString
		err := rows.Scan(&field, &dataType, &null, &key, &defaultValue, &extra)
		if err != nil {
			log.Fatal("扫描suppliers表结构失败:", err)
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
