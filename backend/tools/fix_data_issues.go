package main

import (
	"backend/db"
	"backend/models"
	"bufio"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strings"
	"time"
)

func loadEnv() {
	file, err := os.Open("../.env")
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if os.Getenv(key) == "" {
				os.Setenv(key, value)
			}
		}
	}
}

func fixDataIssues() {
	fmt.Println("=== 修复数据问题 ===")

	// 修复采购记录中的空基地字段
	var purchasesWithEmptyBase []models.PurchaseEntry
	db.DB.Where("base = '' OR base IS NULL").Find(&purchasesWithEmptyBase)

	if len(purchasesWithEmptyBase) > 0 {
		fmt.Printf("发现 %d 条采购记录基地字段为空，正在修复...\n", len(purchasesWithEmptyBase))

		bases := []string{
			"北京总部基地", "上海运营中心", "深圳研发基地", "广州分部", "杭州技术中心",
			"成都西南基地", "武汉中部中心", "西安西北基地", "南京江苏分部", "青岛山东中心",
		}

		for _, purchase := range purchasesWithEmptyBase {
			randomBase := bases[rand.Intn(len(bases))]
			db.DB.Model(&purchase).Update("base", randomBase)
			fmt.Printf("  修复采购记录 ID:%d, 设置基地为: %s\n", purchase.ID, randomBase)
		}
	}

	// 修复基地开支记录中的问题类别
	var expensesWithBadCategory []models.BaseExpense
	db.DB.Where("category LIKE '%?%' OR category = 'office' OR category = ''").Find(&expensesWithBadCategory)

	if len(expensesWithBadCategory) > 0 {
		fmt.Printf("发现 %d 条基地开支记录类别有问题，正在修复...\n", len(expensesWithBadCategory))

		categories := []string{
			"办公用品", "差旅费", "通讯费", "水电费", "租金", "维修费",
			"培训费", "会议费", "招待费", "广告费", "运输费", "保险费",
		}

		for _, expense := range expensesWithBadCategory {
			randomCategory := categories[rand.Intn(len(categories))]
			db.DB.Model(&expense).Update("category", randomCategory)
			fmt.Printf("  修复基地开支记录 ID:%d, 设置类别为: %s\n", expense.ID, randomCategory)
		}
	}

	// 修复基地开支记录中的空详情字段
	var expensesWithEmptyDetail []models.BaseExpense
	db.DB.Where("detail = '' OR detail IS NULL OR detail LIKE '%?%'").Find(&expensesWithEmptyDetail)

	if len(expensesWithEmptyDetail) > 0 {
		fmt.Printf("发现 %d 条基地开支记录详情字段有问题，正在修复...\n", len(expensesWithEmptyDetail))

		expenseDetails := map[string][]string{
			"办公用品": {"采购打印纸A4", "购买办公桌椅", "采购文具用品", "购买电脑配件", "办公设备维护用品"},
			"差旅费":  {"员工出差交通费", "住宿费用报销", "出差餐费补贴", "客户拜访差旅", "会议出席差旅费"},
			"通讯费":  {"办公室电话费", "网络宽带费用", "手机通讯补贴", "视频会议系统费用", "邮递快递费"},
			"水电费":  {"办公室电费", "用水费用", "空调电费", "照明用电", "设备用电"},
			"租金":   {"办公室租金", "设备租赁费", "停车位租金", "会议室租赁", "仓库租金"},
			"维修费":  {"电脑维修费", "办公设备维护", "空调维修", "网络设备维护", "办公家具维修"},
			"培训费":  {"员工技能培训", "管理培训费用", "在线课程费用", "专业认证费用", "团队建设活动"},
			"会议费":  {"会议室费用", "会议用品采购", "茶水费用", "会议设备租赁", "外部会议费用"},
			"招待费":  {"客户招待用餐", "商务接待费用", "节日礼品费用", "客户拜访礼品", "合作伙伴招待"},
			"广告费":  {"网络推广费用", "宣传材料制作", "广告投放费用", "展会参展费", "品牌推广"},
			"运输费":  {"货物运输费", "快递邮寄费", "物流配送费", "设备运输", "文件传递费"},
			"保险费":  {"办公室财产保险", "设备保险费", "人员意外保险", "责任保险", "货物运输保险"},
		}

		for _, expense := range expensesWithEmptyDetail {
			// 获取当前记录的完整信息
			var fullExpense models.BaseExpense
			db.DB.First(&fullExpense, expense.ID)

			var detail string
			if details, ok := expenseDetails[fullExpense.Category]; ok {
				detail = details[rand.Intn(len(details))]
			} else {
				detail = "日常业务支出"
			}

			db.DB.Model(&expense).Update("detail", detail)
			fmt.Printf("  修复基地开支记录 ID:%d (类别:%s), 设置详情为: %s\n", expense.ID, fullExpense.Category, detail)
		}
	}

	fmt.Println("数据修复完成！")
}

func main() {
	// 设置随机种子
	rand.Seed(time.Now().UnixNano())

	// 加载环境变量
	loadEnv()

	// 初始化数据库连接
	db.Init()

	fmt.Println("开始修复数据问题...")

	// 修复数据问题
	fixDataIssues()

	// 显示修复后的统计信息
	fmt.Println("\n=== 修复后统计结果 ===")
	var expenseCount, purchaseCount int64
	db.DB.Model(&models.BaseExpense{}).Count(&expenseCount)
	db.DB.Model(&models.PurchaseEntry{}).Count(&purchaseCount)
	fmt.Printf("基地开支记录总数: %d\n", expenseCount)
	fmt.Printf("采购记录总数: %d\n", purchaseCount)

	// 验证是否还有问题记录
	var problemExpenses, problemPurchases int64
	db.DB.Model(&models.BaseExpense{}).Where("category LIKE '%?%' OR category = 'office' OR category = '' OR detail = '' OR detail IS NULL").Count(&problemExpenses)
	db.DB.Model(&models.PurchaseEntry{}).Where("base = '' OR base IS NULL").Count(&problemPurchases)

	fmt.Printf("仍有问题的基地开支记录: %d\n", problemExpenses)
	fmt.Printf("仍有问题的采购记录: %d\n", problemPurchases)

	// 显示修复后的最新记录
	fmt.Println("\n=== 修复后的最新5条基地开支记录 ===")
	var recentExpenses []models.BaseExpense
	db.DB.Order("updated_at desc").Limit(5).Find(&recentExpenses)
	for _, expense := range recentExpenses {
		fmt.Printf("基地: %s | 类别: %s | 金额: %.2f | 详情: %s\n",
			expense.Base, expense.Category, expense.Amount, expense.Detail)
	}

	fmt.Println("\n=== 修复后的最新5条采购记录 ===")
	var recentPurchases []models.PurchaseEntry
	db.DB.Order("updated_at desc").Limit(5).Find(&recentPurchases)
	for _, purchase := range recentPurchases {
		fmt.Printf("供应商: %s | 订单号: %s | 总金额: %.2f | 基地: %s\n",
			purchase.Supplier, purchase.OrderNumber, purchase.TotalAmount, purchase.Base)
	}

	fmt.Println("\n数据修复完成！")
}
