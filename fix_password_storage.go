package main

import (
	"database/sql"
	"fmt"

	"golang.org/x/crypto/bcrypt"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// 数据库连接信息
	dsn := "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"

	// 连接数据库
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Printf("数据库连接失败: %v\n", err)
		return
	}
	defer db.Close()

	// 测试连接
	if err := db.Ping(); err != nil {
		fmt.Printf("数据库连接测试失败: %v\n", err)
		return
	}

	fmt.Println("数据库连接成功！")
	fmt.Println("正在修复用户密码存储...")

	// 查询所有用户
	rows, err := db.Query("SELECT id, name, role, password FROM users")
	if err != nil {
		fmt.Printf("查询用户失败: %v\n", err)
		return
	}
	defer rows.Close()

	updatedCount := 0
	skippedCount := 0

	for rows.Next() {
		var id int
		var name, role, password string

		if err := rows.Scan(&id, &name, &role, &password); err != nil {
			fmt.Printf("读取用户数据失败: %v\n", err)
			continue
		}

		// 检查密码是否已经是bcrypt哈希格式（以$2开头）
		isHashed := len(password) >= 3 && password[0] == '$' && password[1] == '2'

		if isHashed {
			fmt.Printf("用户 %s (ID: %d) 的密码已经是bcrypt哈希格式，跳过\n", name, id)
			skippedCount++
			continue
		}

		// 为明文密码生成bcrypt哈希
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			fmt.Printf("为用户 %s (ID: %d) 生成密码哈希失败: %v\n", name, id, err)
			continue
		}

		// 更新数据库中的密码
		_, err = db.Exec("UPDATE users SET password = ? WHERE id = ?", string(hash), id)
		if err != nil {
			fmt.Printf("更新用户 %s (ID: %d) 的密码失败: %v\n", name, id, err)
			continue
		}

		fmt.Printf("用户 %s (ID: %d) 的密码已更新为bcrypt哈希格式\n", name, id)
		updatedCount++
	}

	if err := rows.Err(); err != nil {
		fmt.Printf("遍历用户数据时出错: %v\n", err)
		return
	}

	fmt.Printf("\n密码修复完成！\n")
	fmt.Printf("已更新: %d 个用户\n", updatedCount)
	fmt.Printf("已跳过: %d 个用户\n", skippedCount)
}
