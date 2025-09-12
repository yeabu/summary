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

	fmt.Println("开始清理旧字段...")

	// 1. 删除users表中的base字段
	fmt.Println("1. 删除users表中的base字段...")
	_, err = db.Exec("ALTER TABLE users DROP COLUMN base")
	if err != nil {
		fmt.Println("   删除base字段失败:", err)
	} else {
		fmt.Println("   base字段删除成功")
	}

	// 2. 删除purchase_entries表中的supplier字段
	fmt.Println("2. 删除purchase_entries表中的supplier字段...")
	_, err = db.Exec("ALTER TABLE purchase_entries DROP COLUMN supplier")
	if err != nil {
		fmt.Println("   删除supplier字段失败:", err)
	} else {
		fmt.Println("   supplier字段删除成功")
	}

	// 3. 删除payable_records表中的supplier字段
	fmt.Println("3. 删除payable_records表中的supplier字段...")
	_, err = db.Exec("ALTER TABLE payable_records DROP COLUMN supplier")
	if err != nil {
		fmt.Println("   删除supplier字段失败:", err)
	} else {
		fmt.Println("   supplier字段删除成功")
	}

	fmt.Println("旧字段清理完成！")
}
