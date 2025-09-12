package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// 数据库连接配置 - 尝试从环境变量获取，否则使用默认值
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "root:123456@tcp(localhost:3306)/expense_tracker?charset=utf8mb4&parseTime=True&loc=Local"
	}

	fmt.Printf("尝试连接数据库: %s\n", dsn)

	// 连接数据库
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Printf("数据库连接失败: %v", err)
		fmt.Println("请确保:")
		fmt.Println("1. MySQL服务正在运行")
		fmt.Println("2. 数据库连接信息正确")
		fmt.Println("3. 数据库expense_tracker存在")
		return
	}
	defer db.Close()

	// 验证连接
	fmt.Println("正在验证数据库连接...")
	if err := db.Ping(); err != nil {
		log.Printf("数据库连接验证失败: %v", err)
		fmt.Println("请确保:")
		fmt.Println("1. MySQL服务正在运行")
		fmt.Println("2. 用户名和密码正确")
		fmt.Println("3. 数据库服务器地址和端口正确")
		return
	}

	fmt.Println("数据库连接成功!")
	fmt.Println("验证user_bases表结构...")

	// 检查是否存在user_bases表
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM user_bases").Scan(&count)
	if err != nil {
		log.Printf("查询user_bases表时出错: %v", err)
		fmt.Println("请确保user_bases表已创建")
	} else {
		fmt.Printf("user_bases表中的记录数: %d\n", count)
	}

	// 显示user_bases关联数据示例
	rows, err := db.Query(`
		SELECT 
			ub.id,
			u.name as user_name,
			b.name as base_name
		FROM user_bases ub
		JOIN users u ON ub.user_id = u.id
		JOIN bases b ON ub.base_id = b.id
		ORDER BY ub.id
		LIMIT 5
	`)
	if err != nil {
		log.Printf("查询user_bases数据时出错: %v", err)
		fmt.Println("请确保users表和bases表存在且有数据")
	} else {
		fmt.Println("user_bases关联数据示例:")
		defer rows.Close()
		for rows.Next() {
			var id int
			var userName, baseName string
			if err := rows.Scan(&id, &userName, &baseName); err != nil {
				log.Printf("扫描行数据时出错: %v", err)
				continue
			}
			fmt.Printf("ID: %d, 用户: %s, 基地: %s\n", id, userName, baseName)
		}
	}

	// 验证多对多关系是否正常工作 - 用户及其关联基地
	userRows, err := db.Query(`
		SELECT 
			u.name as user_name,
			COUNT(ub.base_id) as base_count
		FROM users u
		LEFT JOIN user_bases ub ON u.id = ub.user_id
		GROUP BY u.id, u.name
		ORDER BY base_count DESC
		LIMIT 3
	`)
	if err != nil {
		log.Printf("查询用户数据时出错: %v", err)
	} else {
		fmt.Println("用户及其关联基地数:")
		defer userRows.Close()
		for userRows.Next() {
			var userName string
			var baseCount int
			if err := userRows.Scan(&userName, &baseCount); err != nil {
				log.Printf("扫描用户行数据时出错: %v", err)
				continue
			}
			fmt.Printf("用户: %s, 关联基地数: %d\n", userName, baseCount)
		}
	}

	// 验证反向关系 - 基地及其关联用户
	baseRows, err := db.Query(`
		SELECT 
			b.name as base_name,
			COUNT(ub.user_id) as user_count
		FROM bases b
		LEFT JOIN user_bases ub ON b.id = ub.base_id
		GROUP BY b.id, b.name
		ORDER BY user_count DESC
		LIMIT 3
	`)
	if err != nil {
		log.Printf("查询基地数据时出错: %v", err)
	} else {
		fmt.Println("基地及其关联用户数:")
		defer baseRows.Close()
		for baseRows.Next() {
			var baseName string
			var userCount int
			if err := baseRows.Scan(&baseName, &userCount); err != nil {
				log.Printf("扫描基地行数据时出错: %v", err)
				continue
			}
			fmt.Printf("基地: %s, 关联用户数: %d\n", baseName, userCount)
		}
	}

	fmt.Println("验证完成!")
}
