package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

func main1() {
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

	// 查询基地表记录数
	var baseCount int
	err = db.QueryRow("SELECT COUNT(*) FROM bases").Scan(&baseCount)
	if err != nil {
		log.Fatal("查询基地表记录数失败:", err)
	}
	fmt.Printf("基地表中的记录数: %d\n", baseCount)

	// 查询分区表记录数
	var sectionCount int
	err = db.QueryRow("SELECT COUNT(*) FROM base_sections").Scan(&sectionCount)
	if err != nil {
		log.Fatal("查询分区表记录数失败:", err)
	}
	fmt.Printf("分区表中的记录数: %d\n", sectionCount)

	// 查询用户表记录数
	var userCount int
	err = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil {
		log.Fatal("查询用户表记录数失败:", err)
	}
	fmt.Printf("用户表中的记录数: %d\n", userCount)
}
