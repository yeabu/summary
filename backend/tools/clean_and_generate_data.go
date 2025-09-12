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

func cleanInvalidRecords() {
	fmt.Println("=== 清理无效记录 ===")

	// 清理无效的基地开支记录（空字段）
	var invalidExpenses []models.BaseExpense
	db.DB.Where("base = '' OR category = '' OR amount <= 0 OR detail = ''").Find(&invalidExpenses)

	if len(invalidExpenses) > 0 {
		fmt.Printf("发现 %d 条无效的基地开支记录，正在删除...\n", len(invalidExpenses))
		db.DB.Where("base = '' OR category = '' OR amount <= 0 OR detail = ''").Delete(&models.BaseExpense{})
	} else {
		fmt.Println("基地开支记录：未发现无效记录")
	}

	// 清理无效的采购记录（空字段）
	var invalidPurchases []models.PurchaseEntry
	db.DB.Where("supplier = '' OR order_number = '' OR total_amount <= 0 OR receiver = '' OR base = ''").Find(&invalidPurchases)

	if len(invalidPurchases) > 0 {
		fmt.Printf("发现 %d 条无效的采购记录，正在删除...\n", len(invalidPurchases))
		db.DB.Where("supplier = '' OR order_number = '' OR total_amount <= 0 OR receiver = '' OR base = ''").Delete(&models.PurchaseEntry{})
	} else {
		fmt.Println("采购记录：未发现无效记录")
	}

	fmt.Println("无效记录清理完成！")
}

func generateCompleteExpenseData(count int) []models.BaseExpense {
	categories := []string{
		"办公用品", "差旅费", "通讯费", "水电费", "租金", "维修费",
		"培训费", "会议费", "招待费", "广告费", "运输费", "保险费",
	}

	bases := []string{
		"北京总部基地", "上海运营中心", "深圳研发基地", "广州分部", "杭州技术中心",
		"成都西南基地", "武汉中部中心", "西安西北基地", "南京江苏分部", "青岛山东中心",
	}

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

	expenses := make([]models.BaseExpense, count)

	for i := 0; i < count; i++ {
		// 随机日期（最近6个月）
		days := rand.Intn(180)
		expenseDate := time.Now().AddDate(0, 0, -days)

		category := categories[rand.Intn(len(categories))]
		details := expenseDetails[category]
		detail := details[rand.Intn(len(details))]

		// 随机金额（100-10000元）
		amount := float64(rand.Intn(9900)+100) + rand.Float64()

		expenses[i] = models.BaseExpense{
			Base:        bases[rand.Intn(len(bases))],
			Date:        expenseDate,
			Category:    category,
			Amount:      amount,
			Detail:      detail,
			CreatedBy:   1, // 管理员用户ID
			CreatorName: "admin",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
	}

	return expenses
}

func generateCompletePurchaseData(count int) []models.PurchaseEntry {
	suppliers := []string{
		"北京科技有限公司", "上海贸易股份有限公司", "深圳电子科技公司", "广州物流有限公司",
		"杭州软件开发公司", "成都制造有限公司", "武汉机械设备公司", "西安建材有限公司",
		"南京化工有限公司", "青岛海运物流公司", "天津钢铁有限公司", "重庆汽车配件公司",
		"沈阳重工业公司", "长沙电力设备公司", "福州食品有限公司", "昆明农业科技公司",
	}

	bases := []string{
		"北京总部基地", "上海运营中心", "深圳研发基地", "广州分部", "杭州技术中心",
		"成都西南基地", "武汉中部中心", "西安西北基地", "南京江苏分部", "青岛山东中心",
	}

	receivers := []string{
		"仓库管理员", "采购部经理", "行政部主管", "财务部负责人", "技术部主管",
		"运营部经理", "人事部负责人", "市场部主管", "客服部经理", "质量部主管",
	}

	productCategories := map[string][]string{
		"办公设备": {"联想ThinkPad笔记本电脑", "戴尔显示器27寸", "惠普激光打印机", "罗技无线鼠标", "机械键盘"},
		"办公用品": {"A4复印纸", "档案盒", "签字笔", "订书机", "文件夹"},
		"电子产品": {"苹果iPad平板", "华为手机", "小米路由器", "海康威视摄像头", "UPS不间断电源"},
		"办公家具": {"人体工学办公椅", "实木办公桌", "文件柜", "会议桌", "书架"},
		"清洁用品": {"洗手液", "垃圾袋", "清洁剂", "纸巾", "消毒液"},
		"食品饮料": {"咖啡豆", "茶叶", "矿泉水", "饼干", "方便面"},
	}

	purchases := make([]models.PurchaseEntry, count)

	for i := 0; i < count; i++ {
		// 随机日期（最近3个月）
		days := rand.Intn(90)
		purchaseDate := time.Now().AddDate(0, 0, -days)

		// 随机选择产品类别和产品
		categoryKeys := make([]string, 0, len(productCategories))
		for k := range productCategories {
			categoryKeys = append(categoryKeys, k)
		}
		category := categoryKeys[rand.Intn(len(categoryKeys))]
		products := productCategories[category]

		// 生成1-5个采购项目
		itemCount := rand.Intn(5) + 1
		var totalAmount float64

		items := make([]models.PurchaseEntryItem, itemCount)
		for j := 0; j < itemCount; j++ {
			product := products[rand.Intn(len(products))]
			quantity := float64(rand.Intn(10) + 1)
			unitPrice := float64(rand.Intn(1000)+50) + rand.Float64()
			amount := quantity * unitPrice
			totalAmount += amount

			items[j] = models.PurchaseEntryItem{
				ProductName: product,
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
			Receiver:     receivers[rand.Intn(len(receivers))],
			Base:         bases[rand.Intn(len(bases))],
			CreatedBy:    1, // 管理员用户ID
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
			Items:        items,
		}
	}

	return purchases
}

func main() {
	// 加载环境变量
	loadEnv()

	// 初始化数据库连接
	db.Init()

	fmt.Println("开始数据清理和重新生成...")

	// 1. 清理无效记录
	cleanInvalidRecords()

	// 2. 检查基地开支记录数量
	var expenseCount int64
	db.DB.Model(&models.BaseExpense{}).Count(&expenseCount)
	fmt.Printf("\n当前基地开支记录数量: %d\n", expenseCount)

	if expenseCount < 50 {
		fmt.Printf("基地开支记录不足50条，需要插入 %d 条记录\n", 50-int(expenseCount))

		// 生成并插入基地开支数据
		expenses := generateCompleteExpenseData(50 - int(expenseCount))
		for i, expense := range expenses {
			if err := db.DB.Create(&expense).Error; err != nil {
				log.Printf("插入第 %d 条基地开支记录失败: %v", i+1, err)
			} else {
				fmt.Printf("✓ 插入基地开支: %s - %s - %.2f元\n",
					expense.Base, expense.Category, expense.Amount)
			}
		}
	} else {
		fmt.Println("基地开支记录数量充足，无需插入")
	}

	// 3. 检查采购记录数量
	var purchaseCount int64
	db.DB.Model(&models.PurchaseEntry{}).Count(&purchaseCount)
	fmt.Printf("\n当前采购记录数量: %d\n", purchaseCount)

	if purchaseCount < 50 {
		fmt.Printf("采购记录不足50条，需要插入 %d 条记录\n", 50-int(purchaseCount))

		// 生成并插入采购数据
		purchases := generateCompletePurchaseData(50 - int(purchaseCount))
		for i, purchase := range purchases {
			if err := db.DB.Create(&purchase).Error; err != nil {
				log.Printf("插入第 %d 条采购记录失败: %v", i+1, err)
			} else {
				fmt.Printf("✓ 插入采购记录: %s - %s - %.2f元\n",
					purchase.Supplier, purchase.OrderNumber, purchase.TotalAmount)
			}
		}
	} else {
		fmt.Println("采购记录数量充足，无需插入")
	}

	// 4. 最终统计
	fmt.Println("\n=== 最终统计结果 ===")
	db.DB.Model(&models.BaseExpense{}).Count(&expenseCount)
	db.DB.Model(&models.PurchaseEntry{}).Count(&purchaseCount)
	fmt.Printf("基地开支记录总数: %d\n", expenseCount)
	fmt.Printf("采购记录总数: %d\n", purchaseCount)

	// 5. 显示最近几条记录作为验证
	fmt.Println("\n=== 最新的5条基地开支记录 ===")
	var recentExpenses []models.BaseExpense
	db.DB.Order("created_at desc").Limit(5).Find(&recentExpenses)
	for _, expense := range recentExpenses {
		fmt.Printf("基地: %s | 类别: %s | 金额: %.2f | 详情: %s\n",
			expense.Base, expense.Category, expense.Amount, expense.Detail)
	}

	fmt.Println("\n=== 最新的5条采购记录 ===")
	var recentPurchases []models.PurchaseEntry
	db.DB.Order("created_at desc").Limit(5).Find(&recentPurchases)
	for _, purchase := range recentPurchases {
		fmt.Printf("供应商: %s | 订单号: %s | 总金额: %.2f | 基地: %s\n",
			purchase.Supplier, purchase.OrderNumber, purchase.TotalAmount, purchase.Base)
	}

	fmt.Println("\n数据清理和生成完成！")
}
