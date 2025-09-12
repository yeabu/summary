package main

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
)

func main() {
	// 初始化数据库连接
	if err := db.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// 测试创建用户与基地关联
	fmt.Println("Testing user-base association...")

	// 创建测试用户
	user := models.User{
		Name:     "test_user",
		Role:     "base_agent",
		Password: "test_password",
	}

	if err := db.DB.Create(&user).Error; err != nil {
		log.Fatal("Failed to create test user:", err)
	}

	// 创建测试基地
	base := models.Base{
		Name:     "test_base",
		Code:     "TB001",
		Location: "Test Location",
	}

	if err := db.DB.Create(&base).Error; err != nil {
		log.Fatal("Failed to create test base:", err)
	}

	// 创建用户与基地的关联
	userBase := models.UserBase{
		UserID: user.ID,
		BaseID: base.ID,
	}

	if err := db.DB.Create(&userBase).Error; err != nil {
		log.Fatal("Failed to create user-base association:", err)
	}

	fmt.Println("User-Base association created successfully!")

	// 验证关联
	var retrievedUser models.User
	if err := db.DB.Preload("Bases").First(&retrievedUser, user.ID).Error; err != nil {
		log.Fatal("Failed to retrieve user with bases:", err)
	}

	fmt.Printf("User: %s, Role: %s\n", retrievedUser.Name, retrievedUser.Role)
	fmt.Printf("Associated Bases: %d\n", len(retrievedUser.Bases))
	for _, b := range retrievedUser.Bases {
		fmt.Printf("- Base: %s (Code: %s)\n", b.Name, b.Code)
	}

	// 清理测试数据
	db.DB.Delete(&userBase)
	db.DB.Delete(&base)
	db.DB.Delete(&user)

	fmt.Println("Test completed and data cleaned up!")
}
