package main

import (
	"fmt"
	"os"
	"golang.org/x/crypto/bcrypt"
	"backend/db"
	"backend/models"
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

	fmt.Println("正在更新管理员密码...")

	// 查找管理员用户
	var admin models.User
	if err := db.DB.Where("name = ? AND role = ?", "admin", "admin").First(&admin).Error; err != nil {
		fmt.Printf("未找到管理员用户: %v\n", err)
		return
	}

	// 生成新密码的哈希
	newPassword := "admin123456"
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		fmt.Printf("密码哈希生成失败: %v\n", err)
		return
	}

	// 更新密码
	if err := db.DB.Model(&admin).Update("password", string(hash)).Error; err != nil {
		fmt.Printf("密码更新失败: %v\n", err)
		return
	}

	fmt.Printf("管理员密码已成功更新为: %s\n", newPassword)
	fmt.Printf("用户ID: %d, 用户名: %s, 角色: %s\n", admin.ID, admin.Name, admin.Role)
}