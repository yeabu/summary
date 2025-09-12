package main

import (
	"database/sql"
	"fmt"

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
	fmt.Println("正在检查用户密码存储情况...")

	// 查询所有用户
	rows, err := db.Query("SELECT id, name, role, password FROM users")
	if err != nil {
		fmt.Printf("查询用户失败: %v\n", err)
		return
	}
	defer rows.Close()

	fmt.Println("用户密码存储情况:")
	fmt.Println("ID\t用户名\t\t角色\t\t密码类型\t\t密码内容")
	fmt.Println("--\t------\t\t----\t\t--------\t\t--------")

	for rows.Next() {
		var id int
		var name, role, password string

		if err := rows.Scan(&id, &name, &role, &password); err != nil {
			fmt.Printf("读取用户数据失败: %v\n", err)
			continue
		}

		// 检查密码是否为bcrypt哈希格式（以$2开头）
		isHashed := len(password) >= 3 && password[0] == '$' && password[1] == '2'
		passwordType := "明文"
		if isHashed {
			passwordType = "bcrypt哈希"
		}

		// 截断显示密码内容
		displayPassword := password
		if len(password) > 20 {
			displayPassword = password[:20] + "..."
		}

		fmt.Printf("%d\t%s\t\t%s\t\t%s\t\t%s\n", id, name, role, passwordType, displayPassword)
	}

	if err := rows.Err(); err != nil {
		fmt.Printf("遍历用户数据时出错: %v\n", err)
	}
}
