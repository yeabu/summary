package main

import (
	"backend/db"
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	fmt.Println("开始执行base_expenses表结构迁移...")

	// 加载环境变量
	loadEnv()

	// 初始化数据库
	db.Init()

	// 执行迁移
	if err := runMigration(db.DB); err != nil {
		log.Fatalf("迁移失败: %v", err)
	}

	fmt.Println("数据库迁移完成!")
}

func loadEnv() {
	// 简化的环境变量加载
	// 实际项目中应该使用更完整的env加载逻辑
}

func runMigration(database *sql.DB) error {
	// 读取并执行SQL迁移脚本
	migrationSQL := `
	-- 创建expense_categories表（如果尚未存在）
	CREATE TABLE IF NOT EXISTS expense_categories (
		id INT AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(50) NOT NULL UNIQUE,
		code VARCHAR(20) UNIQUE,
		status VARCHAR(20) DEFAULT 'active',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	);

	-- 向expense_categories表中插入默认类别（如果表为空）
	INSERT IGNORE INTO expense_categories (name, code, status) VALUES 
	('伙食费', 'FOOD', 'active'),
	('修车费', 'REPAIR', 'active'),
	('电费', 'ELECTRICITY', 'active'),
	('加油费', 'FUEL', 'active'),
	('材料费', 'MATERIAL', 'active');

	-- 添加category_id列到base_expenses表（如果尚未存在）
	ALTER TABLE base_expenses 
	ADD COLUMN IF NOT EXISTS category_id INT AFTER category;

	-- 更新category_id列的值（基于现有的category文本值）
	UPDATE base_expenses be
	JOIN expense_categories ec ON be.category = ec.name
	SET be.category_id = ec.id
	WHERE be.category IS NOT NULL AND be.category != '' AND be.category_id IS NULL;
	`

	// 分步执行SQL语句
	queries := []string{
		`CREATE TABLE IF NOT EXISTS expense_categories (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(50) NOT NULL UNIQUE,
			code VARCHAR(20) UNIQUE,
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`INSERT IGNORE INTO expense_categories (name, code, status) VALUES 
		('伙食费', 'FOOD', 'active'),
		('修车费', 'REPAIR', 'active'),
		('电费', 'ELECTRICITY', 'active'),
		('加油费', 'FUEL', 'active'),
		('材料费', 'MATERIAL', 'active')`,
		`ALTER TABLE base_expenses ADD COLUMN IF NOT EXISTS category_id INT AFTER category`,
		`UPDATE base_expenses be
		JOIN expense_categories ec ON be.category = ec.name
		SET be.category_id = ec.id
		WHERE be.category IS NOT NULL AND be.category != '' AND be.category_id IS NULL`,
	}

	for i, query := range queries {
		fmt.Printf("执行步骤 %d...\n", i+1)
		_, err := database.Exec(query)
		if err != nil {
			return fmt.Errorf("执行步骤 %d 失败: %v", i+1, err)
		}
	}

	// 检查外键约束是否已存在
	var constraintExists int
	err := database.QueryRow(`
		SELECT COUNT(*) 
		FROM information_schema.TABLE_CONSTRAINTS 
		WHERE CONSTRAINT_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND CONSTRAINT_NAME = 'fk_base_expenses_category_id'
	`).Scan(&constraintExists)

	if err != nil {
		return fmt.Errorf("检查外键约束失败: %v", err)
	}

	// 如果外键约束不存在，则添加
	if constraintExists == 0 {
		fmt.Println("添加外键约束...")
		_, err = database.Exec(`
			ALTER TABLE base_expenses 
			ADD CONSTRAINT fk_base_expenses_category_id 
			FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
		`)
		if err != nil {
			return fmt.Errorf("添加外键约束失败: %v", err)
		}
	} else {
		fmt.Println("外键约束已存在，跳过添加")
	}

	// 检查索引是否已存在
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

	// 如果索引不存在，则添加
	if indexExists == 0 {
		fmt.Println("添加索引...")
		_, err = database.Exec(`
			CREATE INDEX idx_base_expenses_category_id ON base_expenses(category_id)
		`)
		if err != nil {
			return fmt.Errorf("添加索引失败: %v", err)
		}
	} else {
		fmt.Println("索引已存在，跳过添加")
	}

	// 验证迁移结果
	fmt.Println("验证迁移结果...")
	var totalExpenses, expensesWithCategoryID, expensesWithCategory int
	err = database.QueryRow(`
		SELECT 
			COUNT(*) as total_expenses,
			COUNT(category_id) as expenses_with_category_id,
			COUNT(category) as expenses_with_category
		FROM base_expenses
	`).Scan(&totalExpenses, &expensesWithCategoryID, &expensesWithCategory)

	if err != nil {
		return fmt.Errorf("验证迁移结果失败: %v", err)
	}

	fmt.Printf("迁移验证结果:\n")
	fmt.Printf("- 总费用记录数: %d\n", totalExpenses)
	fmt.Printf("- 已设置category_id的记录数: %d\n", expensesWithCategoryID)
	fmt.Printf("- 仍使用category字段的记录数: %d\n", expensesWithCategory)

	return nil
}
