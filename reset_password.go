package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 从环境变量读取数据库连接
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}
	defer db.Close()

	// 生成新密码hash
	newPassword := "123456"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("密码加密失败:", err)
	}

	// 更新admin用户密码
	result, err := db.Exec("UPDATE users SET password = ? WHERE name = 'admin'", string(hashedPassword))
	if err != nil {
		log.Fatal("更新密码失败:", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		fmt.Println("admin密码已重置为: 123456")
	} else {
		fmt.Println("未找到admin用户")
	}
}
