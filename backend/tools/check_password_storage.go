package main

import (
	"backend/db"
	"backend/models"
	"fmt"
	"os"
)

func main() {
	// 设置环境变量
	if os.Getenv("MYSQL_DSN") == "" {
		os.Setenv("MYSQL_DSN", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local")
	}
	if os.Getenv("JWT_SECRET") == "" {
		os.Setenv("JWT_SECRET", "REPLACE_THIS_WITH_YOUR_SECRET")
	}

	// 初始化数据库连接
	db.Init()

	fmt.Println("正在检查用户密码存储情况...")

	// 获取所有用户
	var users []models.User
	if err := db.DB.Find(&users).Error; err != nil {
		fmt.Printf("查询用户失败: %v\n", err)
		return
	}

	fmt.Printf("共找到 %d 个用户:\n", len(users))
	for _, user := range users {
		// 检查密码是否为bcrypt哈希格式（以$2开头）
		isHashed := len(user.Password) >= 3 && user.Password[0] == '$' && user.Password[1] == '2'
		hashType := "明文"
		if isHashed {
			hashType = "bcrypt哈希"
		}

		fmt.Printf("ID: %d, 用户名: %s, 角色: %s, 密码类型: %s, 密码: %s\n",
			user.ID, user.Name, user.Role, hashType, user.Password)
	}
}
