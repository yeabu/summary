package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"
	"os"
	"golang.org/x/crypto/bcrypt"
	"backend/db"
	"backend/models"
)

// 基地列表
var bases = []string{
	"北京基地", "上海基地", "广州基地", "深圳基地", "杭州基地",
	"南京基地", "成都基地", "武汉基地", "西安基地", "青岛基地",
}

// 供应商列表
var suppliers = []string{
	"阿里巴巴有限公司", "腾讯科技有限公司", "百度网络技术公司", "京东商城",
	"华为技术有限公司", "小米科技有限公司", "字节跳动科技", "美团网络科技",
	"滴滴出行科技", "网易公司", "新浪微博", "搜狐网络",
}

// 产品列表
var products = []string{
	"笔记本电脑", "台式电脑", "显示器", "键盘", "鼠标", "打印机",
	"办公桌", "办公椅", "文件柜", "投影仪", "会议桌", "白板",
	"网络设备", "服务器", "存储设备", "安全设备", "监控设备",
	"办公用品", "清洁用品", "饮用水", "茶叶咖啡", "纸张耗材",
}

// 费用类别
var categories = []string{
	"办公用品", "差旅费", "通讯费", "水电费", "租金", "维修费",
	"培训费", "会议费", "招待费", "广告费", "运输费", "保险费",
}

// 费用详情模板
var expenseDetails = map[string][]string{
	"办公用品": {"购买打印纸", "购买笔墨", "购买订书机", "购买文件夹"},
	"差旅费":   {"员工出差住宿费", "员工出差交通费", "员工出差餐费"},
	"通讯费":   {"公司电话费", "网络费用", "手机话费"},
	"水电费":   {"办公室电费", "办公室水费", "空调费用"},
	"租金":    {"办公室租金", "仓库租金", "设备租赁费"},
	"维修费":   {"设备维修", "办公室装修", "设备保养"},
	"培训费":   {"员工技能培训", "管理培训", "安全培训"},
	"会议费":   {"年度会议费用", "培训会议", "客户会议"},
	"招待费":   {"客户招待", "合作伙伴招待", "员工聚餐"},
	"广告费":   {"网络推广", "户外广告", "宣传材料"},
	"运输费":   {"货物运输", "快递费用", "物流费用"},
	"保险费":   {"设备保险", "人员保险", "财产保险"},
}

func generateUsers(count int) []models.User {
	users := make([]models.User, count)
	
	// 生成1个管理员
	hash, _ := bcrypt.GenerateFromPassword([]byte("admin123456"), bcrypt.DefaultCost)
	users[0] = models.User{
		Name:     "admin",
		Role:     "admin",
		Base:     "",
		Password: string(hash),
	}
	
	// 生成基地代理
	for i := 1; i < count; i++ {
		hash, _ := bcrypt.GenerateFromPassword([]byte("agent123"), bcrypt.DefaultCost)
		users[i] = models.User{
			Name:     fmt.Sprintf("agent_%d", i),
			Role:     "base_agent",
			Base:     bases[rand.Intn(len(bases))],
			Password: string(hash),
		}
	}
	
	return users
}

func generatePurchases(count int) []models.PurchaseEntry {
	purchases := make([]models.PurchaseEntry, count)
	
	for i := 0; i < count; i++ {
		// 随机日期（最近3个月）
		days := rand.Intn(90)
		purchaseDate := time.Now().AddDate(0, 0, -days)
		
		// 生成采购项目（1-5个商品）
		itemCount := rand.Intn(5) + 1
		items := make([]models.PurchaseEntryItem, itemCount)
		totalAmount := 0.0
		
		for j := 0; j < itemCount; j++ {
			quantity := float64(rand.Intn(10) + 1)
			unitPrice := float64(rand.Intn(5000) + 100)
			amount := quantity * unitPrice
			totalAmount += amount
			
			items[j] = models.PurchaseEntryItem{
				ProductName: products[rand.Intn(len(products))],
				Quantity:    quantity,
				UnitPrice:   unitPrice,
				Amount:      amount,
			}
		}
		
		purchases[i] = models.PurchaseEntry{
			Supplier:     suppliers[rand.Intn(len(suppliers))],
			OrderNumber:  fmt.Sprintf("PO%d%04d", time.Now().Year(), i+1),
			PurchaseDate: purchaseDate,
			TotalAmount:  totalAmount,
			Receiver:     fmt.Sprintf("仓库%d", rand.Intn(5)+1),
			CreatedBy:    1, // admin user ID
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
			Items:        items,
		}
	}
	
	return purchases
}

func generateExpenses(count int, userIDs []uint) []models.BaseExpense {
	expenses := make([]models.BaseExpense, count)
	
	for i := 0; i < count; i++ {
		// 随机日期（最近6个月）
		days := rand.Intn(180)
		expenseDate := time.Now().AddDate(0, 0, -days)
		
		category := categories[rand.Intn(len(categories))]
		details := expenseDetails[category]
		detail := details[rand.Intn(len(details))]
		
		// 随机金额
		amount := float64(rand.Intn(10000)+100) + rand.Float64()
		
		// 随机选择基地代理用户
		userID := userIDs[rand.Intn(len(userIDs))]
		
		expenses[i] = models.BaseExpense{
			Base:        bases[rand.Intn(len(bases))],
			Date:        expenseDate,
			Category:    category,
			Amount:      amount,
			Detail:      detail,
			CreatedBy:   userID,
			CreatorName: fmt.Sprintf("用户%d", userID),
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
	}
	
	return expenses
}

func main() {
	// 加载环境变量
	loadEnv()
	
	// 初始化数据库连接
	db.Init()
	
	// 自动迁移数据库表
	db.DB.AutoMigrate(&models.User{}, &models.PurchaseEntry{}, &models.PurchaseEntryItem{}, &models.BaseExpense{})
	
	rand.Seed(time.Now().UnixNano())
	
	fmt.Println("开始生成测试数据...")
	
	// 生成用户数据
	fmt.Println("生成用户数据...")
	users := generateUsers(20) // 1个admin + 19个agent
	for _, user := range users {
		if err := db.DB.Create(&user).Error; err != nil {
			log.Printf("创建用户失败: %v", err)
		}
	}
	fmt.Printf("已生成 %d 个用户\n", len(users))
	
	// 获取所有用户ID
	var userIDs []uint
	var allUsers []models.User
	db.DB.Find(&allUsers)
	for _, user := range allUsers {
		if user.Role == "base_agent" {
			userIDs = append(userIDs, user.ID)
		}
	}
	
	// 生成采购数据
	fmt.Println("生成采购数据...")
	purchases := generatePurchases(30)
	for _, purchase := range purchases {
		if err := db.DB.Create(&purchase).Error; err != nil {
			log.Printf("创建采购记录失败: %v", err)
		}
	}
	fmt.Printf("已生成 %d 条采购记录\n", len(purchases))
	
	// 生成费用数据
	fmt.Println("生成费用数据...")
	expenses := generateExpenses(50, userIDs)
	for _, expense := range expenses {
		if err := db.DB.Create(&expense).Error; err != nil {
			log.Printf("创建费用记录失败: %v", err)
		}
	}
	fmt.Printf("已生成 %d 条费用记录\n", len(expenses))
	
	fmt.Println("测试数据生成完成！")
	fmt.Printf("总计: %d 个用户, %d 条采购记录, %d 条费用记录\n", 
		len(users), len(purchases), len(expenses))
}

// 简单的环境变量加载函数
func loadEnv() {
	// 设置必要的环境变量（如果系统中没有设置的话）
	if os.Getenv("MYSQL_DSN") == "" {
		os.Setenv("MYSQL_DSN", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local")
	}
	if os.Getenv("JWT_SECRET") == "" {
		os.Setenv("JWT_SECRET", "REPLACE_THIS_WITH_YOUR_SECRET")
	}
}