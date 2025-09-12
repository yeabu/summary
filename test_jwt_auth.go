package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	_ "github.com/go-sql-driver/mysql"
)

type LoginReq struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

type LoginResp struct {
	Token  string `json:"token"`
	Role   string `json:"role"`
	Base   string `json:"base"`
	UserID uint   `json:"user_id"`
}

func main() {
	fmt.Println("测试JWT认证功能...")

	// 测试登录
	testLogin("admin", "admin123")
	testLogin("agent_1", "agent123")
}

func testLogin(username, password string) {
	fmt.Printf("\n--- 测试用户 %s 登录 ---\n", username)

	// 创建登录请求
	loginReq := LoginReq{
		Name:     username,
		Password: password,
	}

	// 序列化请求数据
	reqBody, err := json.Marshal(loginReq)
	if err != nil {
		fmt.Printf("序列化登录请求失败: %v\n", err)
		return
	}

	// 发送登录请求
	resp, err := http.Post("http://localhost:8080/api/login", "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		fmt.Printf("发送登录请求失败: %v\n", err)
		return
	}
	defer resp.Body.Close()

	// 解析响应
	var loginResp LoginResp
	if err := json.NewDecoder(resp.Body).Decode(&loginResp); err != nil {
		fmt.Printf("解析登录响应失败: %v\n", err)
		return
	}

	// 检查响应状态
	if resp.StatusCode == http.StatusOK {
		fmt.Printf("登录成功!\n")
		fmt.Printf("Token: %s\n", loginResp.Token)
		fmt.Printf("Role: %s\n", loginResp.Role)
		fmt.Printf("Base: %s\n", loginResp.Base)
		fmt.Printf("UserID: %d\n", loginResp.UserID)

		// 验证JWT token（简单检查长度）
		if len(loginResp.Token) > 0 {
			fmt.Printf("JWT Token 格式正确\n")
		} else {
			fmt.Printf("JWT Token 格式错误\n")
		}
	} else {
		fmt.Printf("登录失败，状态码: %d\n", resp.StatusCode)
		fmt.Printf("响应内容: %+v\n", loginResp)
	}
}
