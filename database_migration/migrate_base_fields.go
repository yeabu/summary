package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Base struct {
	ID          uint   `gorm:"primaryKey"`
	Name        string `gorm:"unique;not null"`
	Code        string `gorm:"unique;not null"`
	Location    string
	Description string
	Status      string `gorm:"default:active"`
	CreatedBy   uint
}

var DB *gorm.DB

func main() {
	// 获取数据库连接信息
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		fmt.Print("请输入MySQL连接字符串 (例: root:password@tcp(localhost:3306)/summary?charset=utf8mb4&parseTime=True&loc=Local): ")
		reader := bufio.NewReader(os.Stdin)
		dsn, _ = reader.ReadString('\n')
		dsn = strings.TrimSpace(dsn)
	} else {
		fmt.Printf("使用环境变量中的数据库连接: %s\n", dsn)
	}

	// 初始化数据库连接
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("数据库连接失败: ", err)
	}

	fmt.Println("开始数据库迁移：将Base字段转换为BaseID...")

	// 1. 确保Base表中有基本数据
	if err := ensureBaseData(); err != nil {
		log.Fatal("确保基地数据失败:", err)
	}

	// 2. 迁移BaseExpense表
	if err := migrateBaseExpense(); err != nil {
		log.Fatal("迁移BaseExpense表失败:", err)
	}

	// 3. 迁移PurchaseEntry表
	if err := migratePurchaseEntry(); err != nil {
		log.Fatal("迁移PurchaseEntry表失败:", err)
	}

	fmt.Println("数据库迁移完成！")
}

func ensureBaseData() error {
	fmt.Println("检查并创建基地数据...")

	// 查询所有唯一的基地名称
	var baseNames []string

	// 从BaseExpense表获取基地名称
	err := DB.Raw("SELECT DISTINCT base FROM base_expenses WHERE base IS NOT NULL AND base != ''").Scan(&baseNames).Error
	if err != nil {
		return fmt.Errorf("查询base_expenses表中的基地名称失败: %v", err)
	}

	// 从PurchaseEntry表获取基地名称
	var purchaseBaseNames []string
	err = DB.Raw("SELECT DISTINCT base FROM purchase_entries WHERE base IS NOT NULL AND base != ''").Scan(&purchaseBaseNames).Error
	if err != nil {
		return fmt.Errorf("查询purchase_entries表中的基地名称失败: %v", err)
	}

	// 合并基地名称
	allBaseNames := make(map[string]bool)
	for _, name := range baseNames {
		allBaseNames[name] = true
	}
	for _, name := range purchaseBaseNames {
		allBaseNames[name] = true
	}

	// 为每个唯一的基地名称创建Base记录
	for baseName := range allBaseNames {
		var existingBase Base
		err := DB.Where("name = ?", baseName).First(&existingBase).Error
		if err != nil {
			// 基地不存在，创建新记录
			newBase := Base{
				Name:        baseName,
				Code:        baseName, // 使用名称作为代码
				Location:    "迁移时自动创建",
				Description: "从旧数据迁移时自动创建的基地记录",
				Status:      "active",
				CreatedBy:   1, // 假设管理员用户ID为1
			}
			if err := DB.Create(&newBase).Error; err != nil {
				return fmt.Errorf("创建基地记录失败 [%s]: %v", baseName, err)
			}
			fmt.Printf("创建基地记录: %s (ID: %d)\n", baseName, newBase.ID)
		} else {
			fmt.Printf("基地已存在: %s (ID: %d)\n", baseName, existingBase.ID)
		}
	}

	return nil
}

func migrateBaseExpense() error {
	fmt.Println("迁移BaseExpense表...")

	// 1. 检查base_id字段是否已存在
	var columnExists bool
	err := DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'base_expenses' AND column_name = 'base_id'").Scan(&columnExists).Error
	if err != nil {
		return fmt.Errorf("检查base_id字段失败: %v", err)
	}

	if !columnExists {
		// 2. 添加base_id字段
		fmt.Println("为base_expenses表添加base_id字段...")
		err = DB.Exec("ALTER TABLE base_expenses ADD COLUMN base_id INT UNSIGNED").Error
		if err != nil {
			return fmt.Errorf("添加base_id字段失败: %v", err)
		}
	}

	// 3. 更新base_id字段值
	fmt.Println("更新base_expenses表中的base_id值...")
	err = DB.Exec(`
		UPDATE base_expenses be 
		JOIN bases b ON b.name = be.base 
		SET be.base_id = b.id 
		WHERE be.base IS NOT NULL AND be.base != ''
	`).Error
	if err != nil {
		return fmt.Errorf("更新base_id字段失败: %v", err)
	}

	// 4. 检查是否有未匹配的记录
	var unmatchedCount int64
	err = DB.Raw("SELECT COUNT(*) FROM base_expenses WHERE base_id IS NULL AND (base IS NOT NULL AND base != '')").Scan(&unmatchedCount).Error
	if err != nil {
		return fmt.Errorf("检查未匹配记录失败: %v", err)
	}

	if unmatchedCount > 0 {
		fmt.Printf("警告: 有 %d 条记录的base字段无法匹配到对应的基地ID\n", unmatchedCount)
	}

	return nil
}

func migratePurchaseEntry() error {
	fmt.Println("迁移PurchaseEntry表...")

	// 1. 检查base_id字段是否已存在
	var columnExists bool
	err := DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'purchase_entries' AND column_name = 'base_id'").Scan(&columnExists).Error
	if err != nil {
		return fmt.Errorf("检查base_id字段失败: %v", err)
	}

	if !columnExists {
		// 2. 添加base_id字段
		fmt.Println("为purchase_entries表添加base_id字段...")
		err = DB.Exec("ALTER TABLE purchase_entries ADD COLUMN base_id INT UNSIGNED").Error
		if err != nil {
			return fmt.Errorf("添加base_id字段失败: %v", err)
		}
	}

	// 3. 更新base_id字段值
	fmt.Println("更新purchase_entries表中的base_id值...")
	err = DB.Exec(`
		UPDATE purchase_entries pe 
		JOIN bases b ON b.name = pe.base 
		SET pe.base_id = b.id 
		WHERE pe.base IS NOT NULL AND pe.base != ''
	`).Error
	if err != nil {
		return fmt.Errorf("更新base_id字段失败: %v", err)
	}

	// 4. 检查是否有未匹配的记录
	var unmatchedCount int64
	err = DB.Raw("SELECT COUNT(*) FROM purchase_entries WHERE base_id IS NULL AND (base IS NOT NULL AND base != '')").Scan(&unmatchedCount).Error
	if err != nil {
		return fmt.Errorf("检查未匹配记录失败: %v", err)
	}

	if unmatchedCount > 0 {
		fmt.Printf("警告: 有 %d 条记录的base字段无法匹配到对应的基地ID\n", unmatchedCount)
	}

	return nil
}
