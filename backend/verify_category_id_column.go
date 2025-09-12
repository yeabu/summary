package main

import (
	"backend/db"
	"fmt"
	"log"
)

func main() {
	fmt.Println("验证base_expenses表中的category_id列...")

	// 加载环境变量
	loadEnv()

	// 初始化数据库
	db.Init()

	// 执行验证
	if err := verifyCategoryIDColumn(db.DB); err != nil {
		log.Fatalf("验证失败: %v", err)
	}

	fmt.Println("验证完成!")
}

func loadEnv() {
	// 简化的环境变量加载
	// 实际项目中应该使用更完整的env加载逻辑
}

func verifyCategoryIDColumn(database db.SQL) error {
	// 1. 检查category_id列是否存在
	fmt.Println("1. 检查category_id列是否存在...")
	var columnExists int
	err := database.QueryRow(`
		SELECT COUNT(*) 
		FROM INFORMATION_SCHEMA.COLUMNS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND COLUMN_NAME = 'category_id'
	`).Scan(&columnExists)

	if err != nil {
		return fmt.Errorf("检查category_id列是否存在时出错: %v", err)
	}

	if columnExists == 0 {
		return fmt.Errorf("category_id列不存在")
	}
	fmt.Println("   ✓ category_id列存在")

	// 2. 检查列的属性
	fmt.Println("2. 检查category_id列的属性...")
	var columnName, columnType, isNullable string
	var columnDefault *string
	err = database.QueryRow(`
		SELECT 
			COLUMN_NAME, 
			COLUMN_TYPE, 
			IS_NULLABLE, 
			COLUMN_DEFAULT 
		FROM INFORMATION_SCHEMA.COLUMNS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND COLUMN_NAME = 'category_id'
	`).Scan(&columnName, &columnType, &isNullable, &columnDefault)

	if err != nil {
		return fmt.Errorf("检查category_id列属性时出错: %v", err)
	}

	fmt.Printf("   列名: %s\n", columnName)
	fmt.Printf("   数据类型: %s\n", columnType)
	fmt.Printf("   是否可为空: %s\n", isNullable)
	if columnDefault != nil {
		fmt.Printf("   默认值: %s\n", *columnDefault)
	} else {
		fmt.Printf("   默认值: NULL\n")
	}

	// 3. 检查expense_categories表是否存在
	fmt.Println("3. 检查expense_categories表是否存在...")
	var tableExists int
	err = database.QueryRow(`
		SELECT COUNT(*) 
		FROM INFORMATION_SCHEMA.TABLES 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'expense_categories'
	`).Scan(&tableExists)

	if err != nil {
		return fmt.Errorf("检查expense_categories表是否存在时出错: %v", err)
	}

	if tableExists == 0 {
		return fmt.Errorf("expense_categories表不存在")
	}
	fmt.Println("   ✓ expense_categories表存在")

	// 4. 检查是否有默认类别
	fmt.Println("4. 检查是否有默认类别...")
	var categoryCount int
	err = database.QueryRow(`
		SELECT COUNT(*) FROM expense_categories
	`).Scan(&categoryCount)

	if err != nil {
		return fmt.Errorf("检查默认类别时出错: %v", err)
	}

	fmt.Printf("   ✓ expense_categories表中有%d个类别\n", categoryCount)

	// 5. 检查数据迁移情况
	fmt.Println("5. 检查数据迁移情况...")
	var totalRecords, recordsWithCategoryID, recordsWithoutMigration int
	err = database.QueryRow(`
		SELECT 
			COUNT(*) as total_records,
			COUNT(category_id) as records_with_category_id,
			COUNT(CASE WHEN category_id IS NULL AND category IS NOT NULL AND category != '' THEN 1 END) as records_without_migration
		FROM base_expenses
	`).Scan(&totalRecords, &recordsWithCategoryID, &recordsWithoutMigration)

	if err != nil {
		return fmt.Errorf("检查数据迁移情况时出错: %v", err)
	}

	fmt.Printf("   总记录数: %d\n", totalRecords)
	fmt.Printf("   已设置category_id的记录数: %d\n", recordsWithCategoryID)
	fmt.Printf("   未迁移的记录数: %d\n", recordsWithoutMigration)

	// 6. 检查外键约束
	fmt.Println("6. 检查外键约束...")
	var constraintExists int
	err = database.QueryRow(`
		SELECT COUNT(*) 
		FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
		WHERE CONSTRAINT_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND CONSTRAINT_NAME = 'fk_base_expenses_category_id'
	`).Scan(&constraintExists)

	if err != nil {
		return fmt.Errorf("检查外键约束时出错: %v", err)
	}

	if constraintExists > 0 {
		fmt.Println("   ✓ 外键约束存在")
	} else {
		fmt.Println("   ⚠ 外键约束不存在")
	}

	// 7. 检查索引
	fmt.Println("7. 检查索引...")
	var indexExists int
	err = database.QueryRow(`
		SELECT COUNT(*) 
		FROM INFORMATION_SCHEMA.STATISTICS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND INDEX_NAME = 'idx_base_expenses_category_id'
	`).Scan(&indexExists)

	if err != nil {
		return fmt.Errorf("检查索引时出错: %v", err)
	}

	if indexExists > 0 {
		fmt.Println("   ✓ 索引存在")
	} else {
		fmt.Println("   ⚠ 索引不存在")
	}

	// 8. 显示类别统计
	fmt.Println("8. 显示类别统计...")
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
		return fmt.Errorf("查询类别统计时出错: %v", err)
	}
	defer rows.Close()

	fmt.Println("   费用类别统计:")
	for rows.Next() {
		var categoryName string
		var expenseCount int
		if err := rows.Scan(&categoryName, &expenseCount); err != nil {
			return fmt.Errorf("扫描类别统计结果时出错: %v", err)
		}
		fmt.Printf("   - %s: %d条记录\n", categoryName, expenseCount)
	}

	fmt.Println("\n所有验证通过! category_id列已成功添加到base_expenses表中。")
	return nil
}
