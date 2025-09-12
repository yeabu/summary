package main

import (
	"backend/db"
	"fmt"
	"log"
)

func main() {
	fmt.Println("验证base_expenses表迁移结果...")

	// 加载环境变量
	loadEnv()

	// 初始化数据库
	db.Init()

	// 验证迁移结果
	if err := verifyMigration(db.DB); err != nil {
		log.Fatalf("验证失败: %v", err)
	}

	fmt.Println("验证完成!")
}

func loadEnv() {
	// 简化的环境变量加载
	// 实际项目中应该使用更完整的env加载逻辑
}

func verifyMigration(database db.SQL) error {
	// 检查expense_categories表是否存在
	fmt.Println("1. 检查expense_categories表...")
	var categoriesTableExists int
	err := database.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.tables 
		WHERE table_schema = DATABASE() 
		AND table_name = 'expense_categories'
	`).Scan(&categoriesTableExists)

	if err != nil {
		return fmt.Errorf("检查expense_categories表失败: %v", err)
	}

	if categoriesTableExists == 0 {
		return fmt.Errorf("expense_categories表不存在")
	}
	fmt.Println("   ✓ expense_categories表存在")

	// 检查base_expenses表中的category_id字段
	fmt.Println("2. 检查base_expenses表中的category_id字段...")
	var categoryIDColumnExists int
	err = database.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_schema = DATABASE() 
		AND table_name = 'base_expenses' 
		AND column_name = 'category_id'
	`).Scan(&categoryIDColumnExists)

	if err != nil {
		return fmt.Errorf("检查category_id字段失败: %v", err)
	}

	if categoryIDColumnExists == 0 {
		return fmt.Errorf("category_id字段不存在")
	}
	fmt.Println("   ✓ category_id字段存在")

	// 检查外键约束
	fmt.Println("3. 检查外键约束...")
	var foreignKeyExists int
	err = database.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.TABLE_CONSTRAINTS 
		WHERE CONSTRAINT_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND CONSTRAINT_NAME = 'fk_base_expenses_category_id'
	`).Scan(&foreignKeyExists)

	if err != nil {
		return fmt.Errorf("检查外键约束失败: %v", err)
	}

	if foreignKeyExists == 0 {
		fmt.Println("   ⚠ 外键约束不存在（可能是正常情况）")
	} else {
		fmt.Println("   ✓ 外键约束存在")
	}

	// 检查索引
	fmt.Println("4. 检查索引...")
	var indexExists int
	err = database.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.STATISTICS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND INDEX_NAME = 'idx_base_expenses_category_id'
	`).Scan(&indexExists)

	if err != nil {
		return fmt.Errorf("检查索引失败: %v", err)
	}

	if indexExists == 0 {
		fmt.Println("   ⚠ 索引不存在（可能是正常情况）")
	} else {
		fmt.Println("   ✓ 索引存在")
	}

	// 统计数据情况
	fmt.Println("5. 统计数据情况...")
	var totalExpenses, expensesWithCategoryID, expensesWithCategory int
	err = database.QueryRow(`
		SELECT 
			COUNT(*) as total_expenses,
			COUNT(category_id) as expenses_with_category_id,
			COUNT(category) as expenses_with_category
		FROM base_expenses
	`).Scan(&totalExpenses, &expensesWithCategoryID, &expensesWithCategory)

	if err != nil {
		return fmt.Errorf("统计数据情况失败: %v", err)
	}

	fmt.Printf("   - 总费用记录数: %d\n", totalExpenses)
	fmt.Printf("   - 已设置category_id的记录数: %d\n", expensesWithCategoryID)
	fmt.Printf("   - 仍使用category字段的记录数: %d\n", expensesWithCategory)

	// 检查类别关联情况
	fmt.Println("6. 检查类别关联情况...")
	rows, err := database.Query(`
		SELECT 
			ec.name as category_name,
			COUNT(be.id) as expense_count
		FROM expense_categories ec
		LEFT JOIN base_expenses be ON be.category_id = ec.id
		GROUP BY ec.id, ec.name
		ORDER BY expense_count DESC
	`)
	if err != nil {
		return fmt.Errorf("检查类别关联情况失败: %v", err)
	}
	defer rows.Close()

	fmt.Println("   费用类别统计:")
	for rows.Next() {
		var categoryName string
		var expenseCount int
		if err := rows.Scan(&categoryName, &expenseCount); err != nil {
			return fmt.Errorf("扫描类别统计结果失败: %v", err)
		}
		fmt.Printf("   - %s: %d条记录\n", categoryName, expenseCount)
	}

	// 检查未匹配的类别
	fmt.Println("7. 检查未匹配的类别...")
	rows, err = database.Query(`
		SELECT 
			category,
			COUNT(*) as count
		FROM base_expenses 
		WHERE category IS NOT NULL 
		  AND category != '' 
		  AND category_id IS NULL
		GROUP BY category
	`)
	if err != nil {
		return fmt.Errorf("检查未匹配类别失败: %v", err)
	}
	defer rows.Close()

	unmatchedCount := 0
	fmt.Println("   未匹配的类别:")
	for rows.Next() {
		var category string
		var count int
		if err := rows.Scan(&category, &count); err != nil {
			return fmt.Errorf("扫描未匹配类别结果失败: %v", err)
		}
		fmt.Printf("   - %s: %d条记录\n", category, count)
		unmatchedCount += count
	}

	if unmatchedCount == 0 {
		fmt.Println("   ✓ 所有记录都已正确匹配到类别")
	} else {
		fmt.Printf("   ⚠ 有%d条记录未匹配到类别\n", unmatchedCount)
	}

	fmt.Println("迁移验证完成!")
	return nil
}
