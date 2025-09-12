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

	// 检查现有用户
	var users []models.User
	err := db.DB.Find(&users).Error
	if err != nil {
		log.Fatal("查询用户失败:", err)
	}

	fmt.Printf("现有用户数量: %d\n", len(users))
	for _, user := range users {
		fmt.Printf("- ID: %d, Name: %s, Role: %s, Base: %s\n", user.ID, user.Name, user.Role, user.Base)
	}

	// 如果没有管理员用户，创建一个
	var adminCount int64
	db.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&adminCount)

	if adminCount == 0 {
		fmt.Println("\n没有管理员用户，创建默认管理员...")
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		admin := models.User{
			Name:     "admin",
			Role:     "admin",
			Base:     "", // 管理员没有特定基地
			Password: string(hashedPassword),
		}

		if err := db.DB.Create(&admin).Error; err != nil {
			log.Fatal("创建管理员用户失败:", err)
		}
		fmt.Printf("已创建管理员用户: admin / admin123\n")
	}

	// 检查是否有基地代理用户
	var agentCount int64
	db.DB.Model(&models.User{}).Where("role = ?", "base_agent").Count(&agentCount)

	if agentCount == 0 {
		fmt.Println("\n没有基地代理用户，创建测试基地代理...")
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		agent := models.User{
			Name:     "beijing_agent",
			Role:     "base_agent",
			Base:     "北京总部基地",
			Password: string(hashedPassword),
		}

		if err := db.DB.Create(&agent).Error; err != nil {
			log.Fatal("创建基地代理用户失败:", err)
		}
		fmt.Printf("已创建基地代理用户: beijing_agent / 123456 (北京总部基地)\n")
	}

	fmt.Println("\n用户设置完成！")
}
