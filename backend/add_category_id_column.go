package main

import (
	"backend/db"
	"fmt"
	"log"
)

func main() {
	fmt.Println("开始向base_expenses表添加category_id列...")

	// 加载环境变量
	loadEnv()

	// 初始化数据库
	db.Init()

	// 执行修改
	if err := addCategoryIDColumn(db.DB); err != nil {
		log.Fatalf("添加category_id列失败: %v", err)
	}

	fmt.Println("成功向base_expenses表添加了category_id列!")
}

func loadEnv() {
	// 简化的环境变量加载
	// 实际项目中应该使用更完整的env加载逻辑
}

func addCategoryIDColumn(database db.SQL) error {
	// 检查category_id列是否已存在
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

	if columnExists > 0 {
		fmt.Println("category_id列已存在，跳过添加步骤")
	} else {
		fmt.Println("添加category_id列...")
		// 添加category_id列
		_, err = database.Exec(`
			ALTER TABLE base_expenses 
			ADD COLUMN category_id INT NULL AFTER category
		`)
		if err != nil {
			return fmt.Errorf("添加category_id列失败: %v", err)
		}
		fmt.Println("成功添加category_id列")
	}

	// 创建expense_categories表（如果尚未存在）
	fmt.Println("创建expense_categories表...")
	_, err = database.Exec(`
		CREATE TABLE IF NOT EXISTS expense_categories (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(50) NOT NULL UNIQUE,
			code VARCHAR(20) UNIQUE,
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("创建expense_categories表失败: %v", err)
	}
	fmt.Println("成功创建expense_categories表")

	// 插入默认费用类别
	fmt.Println("插入默认费用类别...")
	_, err = database.Exec(`
		INSERT IGNORE INTO expense_categories (name, code, status) VALUES 
		('伙食费', 'FOOD', 'active'),
		('修车费', 'REPAIR', 'active'),
		('电费', 'ELECTRICITY', 'active'),
		('加油费', 'FUEL', 'active'),
		('材料费', 'MATERIAL', 'active')
	`)
	if err != nil {
		return fmt.Errorf("插入默认费用类别失败: %v", err)
	}
	fmt.Println("成功插入默认费用类别")

	// 更新category_id字段值
	fmt.Println("更新category_id字段值...")
	_, err = database.Exec(`
		UPDATE base_expenses be
		JOIN expense_categories ec ON be.category = ec.name
		SET be.category_id = ec.id
		WHERE be.category IS NOT NULL AND be.category != '' AND be.category_id IS NULL
	`)
	if err != nil {
		return fmt.Errorf("更新category_id字段值失败: %v", err)
	}
	fmt.Println("成功更新category_id字段值")

	// 检查外键约束是否已存在
	var constraintExists int
	err = database.QueryRow(`
		SELECT COUNT(*) 
		FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
		WHERE CONSTRAINT_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND CONSTRAINT_NAME = 'fk_base_expenses_category_id'
	`).Scan(&constraintExists)

	if err != nil {
		return fmt.Errorf("检查外键约束是否存在时出错: %v", err)
	}

	if constraintExists > 0 {
		fmt.Println("外键约束已存在，跳过添加步骤")
	} else {
		fmt.Println("添加外键约束...")
		// 添加外键约束
		_, err = database.Exec(`
			ALTER TABLE base_expenses 
			ADD CONSTRAINT fk_base_expenses_category_id 
			FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
		`)
		if err != nil {
			// 外键约束添加可能失败，如果有不匹配的数据，我们记录警告但不终止程序
			fmt.Printf("警告: 添加外键约束失败: %v\n", err)
			fmt.Println("请手动检查并清理不匹配的数据后再添加外键约束")
		} else {
			fmt.Println("成功添加外键约束")
		}
	}

	// 检查索引是否已存在
	var indexExists int
	err = database.QueryRow(`
		SELECT COUNT(*) 
		FROM INFORMATION_SCHEMA.STATISTICS 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = 'base_expenses' 
		AND INDEX_NAME = 'idx_base_expenses_category_id'
	`).Scan(&indexExists)

	if err != nil {
		return fmt.Errorf("检查索引是否存在时出错: %v", err)
	}

	if indexExists > 0 {
		fmt.Println("索引已存在，跳过添加步骤")
	} else {
		fmt.Println("添加索引...")
		// 添加索引
		_, err = database.Exec(`
			CREATE INDEX idx_base_expenses_category_id ON base_expenses(category_id)
		`)
		if err != nil {
			return fmt.Errorf("添加索引失败: %v", err)
		}
		fmt.Println("成功添加索引")
	}

	// 验证修改结果
	fmt.Println("验证修改结果...")
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
		return fmt.Errorf("验证修改结果失败: %v", err)
	}

	fmt.Printf("列信息:\n")
	fmt.Printf("- 名称: %s\n", columnName)
	fmt.Printf("- 类型: %s\n", columnType)
	fmt.Printf("- 是否可为空: %s\n", isNullable)
	if columnDefault != nil {
		fmt.Printf("- 默认值: %s\n", *columnDefault)
	} else {
		fmt.Printf("- 默认值: NULL\n")
	}

	// 统计数据情况
	var totalRecords, recordsWithCategoryID, recordsWithoutMigration int
	err = database.QueryRow(`
		SELECT 
			COUNT(*) as total_records,
			COUNT(category_id) as records_with_category_id,
			COUNT(CASE WHEN category_id IS NULL AND category IS NOT NULL AND category != '' THEN 1 END) as records_without_migration
		FROM base_expenses
	`).Scan(&totalRecords, &recordsWithCategoryID, &recordsWithoutMigration)

	if err != nil {
		return fmt.Errorf("统计数据情况失败: %v", err)
	}

	fmt.Printf("\n数据统计:\n")
	fmt.Printf("- 总记录数: %d\n", totalRecords)
	fmt.Printf("- 已设置category_id的记录数: %d\n", recordsWithCategoryID)
	fmt.Printf("- 未迁移的记录数: %d\n", recordsWithoutMigration)

	return nil
}
