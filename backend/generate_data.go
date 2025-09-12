package main

import (
	"fmt"
	"math/rand"
	"os"
	"strconv"
	"time"

	"backend/db"
	"backend/models"

	"gorm.io/gorm"
)

func main() {
	// 设置数据库连接信息
	os.Setenv("MYSQL_DSN", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local")

	// 初始化数据库
	db.Init()

	// 获取数据库连接
	gormDB := db.DB

	// 获取所有基地
	var bases []models.Base
	result := gormDB.Find(&bases)
	if result.Error != nil {
		fmt.Printf("错误：获取基地数据失败: %v\n", result.Error)
		// 创建一些测试基地
		testBases := createTestBases(gormDB)
		bases = testBases
	}
	fmt.Printf("获取到 %d 个基地\n", len(bases))

	// 获取所有用户
	var users []models.User
	result = gormDB.Find(&users)
	if result.Error != nil {
		fmt.Printf("错误：获取用户数据失败: %v\n", result.Error)
		// 创建一些测试用户
		testUsers := createTestUsers(gormDB)
		users = testUsers
	}
	fmt.Printf("获取到 %d 个用户\n", len(users))

	// 获取所有采购记录
	var purchases []models.PurchaseEntry
	result = gormDB.Find(&purchases)
	if result.Error != nil || len(purchases) == 0 {
		fmt.Println("错误：没有找到采购记录或发生错误")
		// 创建一些测试采购记录
		testPurchases := createTestPurchases(gormDB, bases, users)
		purchases = testPurchases
	}
	fmt.Printf("获取到 %d 个采购记录\n", len(purchases))

	// 生成应付款记录
	payables := generatePayableRecords(gormDB, bases, purchases, users)
	fmt.Printf("获取到 %d 个应付款记录\n", len(payables))

	// 如果没有应付款记录，退出
	if len(payables) == 0 {
		fmt.Println("错误：没有找到应付款记录")
		return
	}

	// 生成一些示例还款记录
	generatePaymentRecords(gormDB, users, payables)
}

// createTestBases 创建一些测试基地
func createTestBases(db *gorm.DB) []models.Base {
	var createdBases []models.Base

	// 创建5个测试基地
	for i := 0; i < 5; i++ {
		// 创建基地
		base := models.Base{
			Name:        fmt.Sprintf("测试基地%d", i+1),
			Code:        fmt.Sprintf("BAS-%03d", i+1),
			Location:    "测试位置",
			Description: fmt.Sprintf("测试基地%d描述", i+1),
			CreatedBy:   1,
		}

		// 插入基地记录
		db.Create(&base)

		// 添加到结果列表
		createdBases = append(createdBases, base)

		fmt.Printf("创建测试基地：ID=%d, 名称=%s\n", base.ID, base.Name)
	}

	return createdBases
}

// createTestUsers 创建一些测试用户
func createTestUsers(db *gorm.DB) []models.User {
	var createdUsers []models.User

	// 创建5个测试用户
	for i := 0; i < 5; i++ {
		// 创建用户
		user := models.User{
			Name:     fmt.Sprintf("测试用户%d", i+1),
			Role:     "admin",  // 设置为管理员角色
			Password: "123456", // 密码
		}

		// 插入用户记录
		db.Create(&user)

		// 添加到结果列表
		createdUsers = append(createdUsers, user)

		fmt.Printf("创建测试用户：ID=%d, 名称=%s\n", user.ID, user.Name)
	}

	return createdUsers
}

// generatePaymentRecords 生成示例还款记录
func generatePaymentRecords(db *gorm.DB, users []models.User, payables []models.PayableRecord) {
	// 为每个应付款记录生成1-3个还款记录
	for _, payable := range payables {
		// 随机生成1-3个还款记录
		numPayments := rand.Intn(3) + 1

		// 记录已付金额
		totalPaid := 0.0

		// 创建还款记录
		for i := 0; i < numPayments; i++ {
			// 如果是最后一个还款记录，确保付清剩余金额
			isLastPayment := i == numPayments-1

			// 计算还款金额
			remaining := payable.TotalAmount - totalPaid
			var paymentAmount float64
			if isLastPayment {
				paymentAmount = remaining
			} else if remaining > 1000 {
				paymentAmount = float64(rand.Intn(1000) + 100) // 每次还款100-1100元
			} else {
				paymentAmount = remaining * 0.5 // 剩余金额的一半
			}

			// 创建还款记录
			payment := models.PaymentRecord{
				PayableRecordID: payable.ID,
				PaymentAmount:   paymentAmount,
				PaymentDate:     time.Now().AddDate(0, -rand.Intn(3), -rand.Intn(30)), // 过去3个月内
				PaymentMethod:   "bank_transfer",
				ReferenceNumber: fmt.Sprintf("REF-%d-%d", payable.ID, i+1),
				Notes:           fmt.Sprintf("还款记录 %d/%d", i+1, numPayments),
				CreatedBy:       users[rand.Intn(len(users))].ID,
			}

			// 插入还款记录
			db.Create(&payment)

			// 更新已付金额
			totalPaid += paymentAmount

			// 输出信息
			fmt.Printf("创建还款记录：应付款ID=%d, 金额=%.2f, 日期=%s\n",
				payment.PayableRecordID, payment.PaymentAmount, payment.PaymentDate.Format("2006-01-02"))
		}

		// 更新应付款记录
		updatePayableRecord(db, payable, totalPaid)
	}
}

// updatePayableRecord 更新应付款记录
func updatePayableRecord(db *gorm.DB, payable models.PayableRecord, totalPaid float64) {
	newPaidAmount := payable.PaidAmount + totalPaid
	newRemainingAmount := payable.TotalAmount - newPaidAmount

	// 确定状态
	status := "partial"
	if newRemainingAmount <= 0.01 {
		status = "paid"
	}

	// 更新应付款记录
	updates := map[string]interface{}{
		"paid_amount":      newPaidAmount,
		"remaining_amount": newRemainingAmount,
		"status":           status,
		"updated_at":       time.Now(),
	}

	db.Model(&payable).Updates(updates)
	fmt.Printf("更新应付款记录：ID=%d, 已付=%.2f, 剩余=%.2f, 状态=%s\n",
		payable.ID, newPaidAmount, newRemainingAmount, status)
}

// generatePayableRecords 生成示例应付款记录
func generatePayableRecords(db *gorm.DB, bases []models.Base, purchases []models.PurchaseEntry, users []models.User) []models.PayableRecord {
	var generatedPayables []models.PayableRecord

	// 为每个采购记录生成应付款记录
	for _, purchase := range purchases {
		// 随机决定是否为这个采购生成应付款记录（50%概率）
		if rand.Intn(2) == 0 {
			continue
		}

		// 随机选择一个供应商
		supplier := "供应商-" + strconv.Itoa(rand.Intn(100))

		// 创建应付款记录
		payable := models.PayableRecord{
			PurchaseEntryID: purchase.ID,
			Supplier:        supplier,
			BaseID:          bases[rand.Intn(len(bases))].ID,
			TotalAmount:     purchase.TotalAmount, // 应付金额等于采购总金额
			PaidAmount:      0,                    // 初始已付金额为0
			RemainingAmount: purchase.TotalAmount, // 初始剩余金额等于总金额
			Status:          "pending",            // 初始状态为待付款
			// 修复DueDate字段，使用* time.Time类型而不是字符串
			DueDate:   &[]time.Time{time.Now().AddDate(0, 1, 0)}[0], // 1个月后到期
			CreatedBy: users[rand.Intn(len(users))].ID,
		}

		// 插入应付款记录
		db.Create(&payable)

		// 添加到结果列表
		generatedPayables = append(generatedPayables, payable)

		// 输出信息
		fmt.Printf("创建应付款记录：ID=%d, 供应商=%s, 金额=%.2f, 到期日期=%s\n",
			payable.ID, payable.Supplier, payable.TotalAmount, payable.DueDate)
	}

	return generatedPayables
}

// createTestPurchases 创建一些测试采购记录
func createTestPurchases(db *gorm.DB, bases []models.Base, users []models.User) []models.PurchaseEntry {
	var createdPurchases []models.PurchaseEntry

	// 创建5个测试采购记录
	for i := 0; i < 5; i++ {
		// 随机选择一个基地
		base := bases[rand.Intn(len(bases))]

		// 创建采购记录
		purchase := models.PurchaseEntry{
			Supplier:     "测试供应商A",
			OrderNumber:  fmt.Sprintf("PO-TEST-%d", i+1),
			PurchaseDate: time.Now(),
			TotalAmount:  5000.0 + float64(rand.Intn(5000)), // 5000-10000元
			Receiver:     "张三",
			BaseID:       base.ID,
			CreatedBy:    users[rand.Intn(len(users))].ID,
			CreatorName:  "测试用户",
		}

		// 插入采购记录
		db.Create(&purchase)

		// 添加到结果列表
		createdPurchases = append(createdPurchases, purchase)

		fmt.Printf("创建测试采购记录：ID=%d, 金额=%.2f\n", purchase.ID, purchase.TotalAmount)
	}

	return createdPurchases
}
