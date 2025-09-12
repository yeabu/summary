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

var DB *gorm.DB

func main() {
	// 获取数据库连接信息
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"
		fmt.Printf("使用默认数据库连接: %s\n", dsn)
	} else {
		fmt.Printf("使用环境变量中的数据库连接: %s\n", dsn)
	}

	// 初始化数据库连接
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("数据库连接失败: ", err)
	}

	fmt.Println("=== 清理冗余的base字段 ===")
	fmt.Println("警告：此操作将永久删除 base_expenses 和 purchase_entries 表中的 base 字段")
	fmt.Println("请确保：")
	fmt.Println("1. 已经备份了数据库")
	fmt.Println("2. base_id 字段工作正常")
	fmt.Println("3. 所有应用程序已更新为使用 base_id 字段")
	fmt.Print("\n确认删除冗余字段吗？(输入 'yes' 继续): ")

	reader := bufio.NewReader(os.Stdin)
	input, _ := reader.ReadString('\n')
	input = strings.TrimSpace(input)

	if input != "yes" {
		fmt.Println("操作已取消")
		return
	}

	fmt.Println("\n开始清理冗余字段...")

	// 1. 最后一次验证数据一致性
	if err := verifyDataConsistency(); err != nil {
		log.Fatal("数据一致性验证失败:", err)
	}

	// 2. 删除 base_expenses 表的 base 字段
	if err := dropBaseExpenseBaseField(); err != nil {
		log.Fatal("删除 base_expenses.base 字段失败:", err)
	}

	// 3. 删除 purchase_entries 表的 base 字段
	if err := dropPurchaseEntryBaseField(); err != nil {
		log.Fatal("删除 purchase_entries.base 字段失败:", err)
	}

	// 4. 验证清理结果
	if err := verifyCleanup(); err != nil {
		log.Fatal("清理验证失败:", err)
	}

	fmt.Println("\n=== 清理完成！ ===")
	fmt.Println("冗余的 base 字段已被删除，现在只使用规范的 base_id 外键字段。")
}

func verifyDataConsistency() error {
	fmt.Println("正在验证数据一致性...")

	// 检查 base_expenses 表
	var expenseInconsistent int64
	err := DB.Raw("SELECT COUNT(*) FROM base_expenses be LEFT JOIN bases b ON b.id = be.base_id WHERE be.base != b.name").Scan(&expenseInconsistent).Error
	if err != nil {
		return fmt.Errorf("验证 base_expenses 一致性失败: %v", err)
	}

	// 检查 purchase_entries 表
	var purchaseInconsistent int64
	err = DB.Raw("SELECT COUNT(*) FROM purchase_entries pe LEFT JOIN bases b ON b.id = pe.base_id WHERE pe.base != b.name").Scan(&purchaseInconsistent).Error
	if err != nil {
		return fmt.Errorf("验证 purchase_entries 一致性失败: %v", err)
	}

	if expenseInconsistent > 0 || purchaseInconsistent > 0 {
		return fmt.Errorf("发现数据不一致：base_expenses=%d, purchase_entries=%d", expenseInconsistent, purchaseInconsistent)
	}

	fmt.Printf("✓ 数据一致性验证通过\n")
	return nil
}

func dropBaseExpenseBaseField() error {
	fmt.Println("删除 base_expenses 表的 base 字段...")

	// 检查字段是否存在
	var columnExists bool
	err := DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'base_expenses' AND column_name = 'base'").Scan(&columnExists).Error
	if err != nil {
		return fmt.Errorf("检查 base 字段失败: %v", err)
	}

	if columnExists {
		err = DB.Exec("ALTER TABLE base_expenses DROP COLUMN base").Error
		if err != nil {
			return fmt.Errorf("删除 base 字段失败: %v", err)
		}
		fmt.Println("✓ base_expenses.base 字段已删除")
	} else {
		fmt.Println("✓ base_expenses.base 字段不存在，跳过删除")
	}

	return nil
}

func dropPurchaseEntryBaseField() error {
	fmt.Println("删除 purchase_entries 表的 base 字段...")

	// 检查字段是否存在
	var columnExists bool
	err := DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'purchase_entries' AND column_name = 'base'").Scan(&columnExists).Error
	if err != nil {
		return fmt.Errorf("检查 base 字段失败: %v", err)
	}

	if columnExists {
		err = DB.Exec("ALTER TABLE purchase_entries DROP COLUMN base").Error
		if err != nil {
			return fmt.Errorf("删除 base 字段失败: %v", err)
		}
		fmt.Println("✓ purchase_entries.base 字段已删除")
	} else {
		fmt.Println("✓ purchase_entries.base 字段不存在，跳过删除")
	}

	return nil
}

func verifyCleanup() error {
	fmt.Println("验证清理结果...")

	// 检查字段是否已删除
	var expenseBaseExists bool
	err := DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'base_expenses' AND column_name = 'base'").Scan(&expenseBaseExists).Error
	if err != nil {
		return fmt.Errorf("验证 base_expenses 清理失败: %v", err)
	}

	var purchaseBaseExists bool
	err = DB.Raw("SELECT COUNT(*) > 0 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'purchase_entries' AND column_name = 'base'").Scan(&purchaseBaseExists).Error
	if err != nil {
		return fmt.Errorf("验证 purchase_entries 清理失败: %v", err)
	}

	if expenseBaseExists || purchaseBaseExists {
		return fmt.Errorf("字段删除未完成：base_expenses.base=%v, purchase_entries.base=%v", expenseBaseExists, purchaseBaseExists)
	}

	// 检查 base_id 字段仍然存在且有数据
	var expenseCount, purchaseCount int64
	DB.Raw("SELECT COUNT(*) FROM base_expenses WHERE base_id IS NOT NULL").Scan(&expenseCount)
	DB.Raw("SELECT COUNT(*) FROM purchase_entries WHERE base_id IS NOT NULL").Scan(&purchaseCount)

	fmt.Printf("✓ 清理验证通过：base_expenses 有 %d 条记录，purchase_entries 有 %d 条记录使用 base_id\n", expenseCount, purchaseCount)
	return nil
}
