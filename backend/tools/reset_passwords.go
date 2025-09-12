package main

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 加载环境变量
	os.Setenv("MYSQL_DSN", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local")

	// 初始化数据库
	db.Init()

	// 重置admin用户密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("密码哈希失败:", err)
	}

	result := db.DB.Model(&models.User{}).Where("name = ?", "admin").Update("password", string(hashedPassword))
	if result.Error != nil {
		log.Fatal("更新密码失败:", result.Error)
	}

	if result.RowsAffected == 0 {
		fmt.Println("未找到admin用户")
	} else {
		fmt.Printf("已重置admin用户密码为: admin123 (影响行数: %d)\n", result.RowsAffected)
	}

	// 同时重置agent_1用户密码
	hashedPassword2, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	result2 := db.DB.Model(&models.User{}).Where("name = ?", "agent_1").Update("password", string(hashedPassword2))
	if result2.Error != nil {
		log.Fatal("更新agent_1密码失败:", result2.Error)
	}

	if result2.RowsAffected > 0 {
		fmt.Printf("已重置agent_1用户密码为: 123456\n")
	}
}
