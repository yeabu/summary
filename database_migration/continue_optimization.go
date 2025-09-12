package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// 数据库连接配置
	dsn := "root:123456@tcp(localhost:3306)/expense_tracker?charset=utf8mb4&parseTime=True&loc=Local"
	fmt.Printf("连接数据库: %s\n", dsn)

	// 连接数据库
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer db.Close()

	// 验证连接
	fmt.Println("验证数据库连接...")
	if err := db.Ping(); err != nil {
		log.Fatalf("数据库连接验证失败: %v", err)
	}
	fmt.Println("✓ 数据库连接成功!")

	// 执行优化步骤
	fmt.Println("\n=== 开始执行优化步骤 ===")

	// 1. 检查并优化user_bases表
	if err := optimizeUserBasesTable(db); err != nil {
		log.Printf("优化user_bases表失败: %v", err)
	} else {
		fmt.Println("✓ user_bases表优化完成")
	}

	// 2. 检查并优化base_expenses表
	if err := optimizeBaseExpensesTable(db); err != nil {
		log.Printf("优化base_expenses表失败: %v", err)
	} else {
		fmt.Println("✓ base_expenses表优化完成")
	}

	// 3. 验证数据一致性
	if err := verifyDataConsistency(db); err != nil {
		log.Printf("数据一致性验证失败: %v", err)
	} else {
		fmt.Println("✓ 数据一致性验证完成")
	}

	fmt.Println("\n=== 优化完成 ===")
}

func optimizeUserBasesTable(db *sql.DB) error {
	fmt.Println("1. 优化user_bases表...")

	// 检查user_bases表是否存在
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_bases'").Scan(&count)
	if err != nil {
		return fmt.Errorf("检查user_bases表失败: %v", err)
	}

	if count == 0 {
		fmt.Println("  user_bases表不存在，创建表...")
		_, err := db.Exec(`
			CREATE TABLE user_bases (
				id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id BIGINT UNSIGNED NOT NULL,
				base_id BIGINT UNSIGNED NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
				FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
				UNIQUE KEY unique_user_base (user_id, base_id),
				INDEX idx_user_id (user_id),
				INDEX idx_base_id (base_id),
				INDEX idx_user_base_combined (user_id, base_id)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
		`)
		if err != nil {
			return fmt.Errorf("创建user_bases表失败: %v", err)
		}
		fmt.Println("  ✓ user_bases表创建成功")
	} else {
		fmt.Println("  user_bases表已存在，检查索引...")
		
		// 检查并添加缺失的索引
		indexes := map[string]string{
			"unique_user_base":      "ALTER TABLE user_bases ADD UNIQUE KEY unique_user_base (user_id, base_id)",
			"idx_user_id":           "ALTER TABLE user_bases ADD INDEX idx_user_id (user_id)",
			"idx_base_id":           "ALTER TABLE user_bases ADD INDEX idx_base_id (base_id)",
			"idx_user_base_combined": "ALTER TABLE user_bases ADD INDEX idx_user_base_combined (user_id, base_id)",
		}

		for indexName, sqlStmt := range indexes {
			var indexCount int
			err := db.QueryRow("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'user_bases' AND index_name = ?", indexName).Scan(&indexCount)
			if err != nil {
				log.Printf("  检查索引 %s 失败: %v", indexName, err)
				continue
			}

			if indexCount == 0 {
				fmt.Printf("  添加缺失的索引: %s\n", indexName)
				_, err := db.Exec(sqlStmt)
				if err != nil {
					log.Printf("  添加索引 %s 失败: %v", indexName, err)
				} else {
					fmt.Printf("  ✓ 索引 %s 添加成功\n", indexName)
				}
			} else {
				fmt.Printf("  ✓ 索引 %s 已存在\n", indexName)
			}
		}
	}

	return nil
}

func optimizeBaseExpensesTable(db *sql.DB) error {
	fmt.Println("2. 优化base_expenses表...")

	// 检查base_expenses表是否存在
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'base_expenses'").Scan(&count)
	if err != nil {
		return fmt.Errorf("检查base_expenses表失败: %v", err)
	}

	if count == 0 {
		fmt.Println("  base_expenses表不存在")
		return nil
	}

	// 检查category_id字段是否存在
	var columnCount int
	err = db.QueryRow("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'base_expenses' AND column_name = 'category_id'").Scan(&columnCount)
	if err != nil {
		return fmt.Errorf("检查category_id字段失败: %v", err)
	}

	if columnCount == 0 {
		fmt.Println("  category_id字段不存在，添加字段...")
		_, err := db.Exec("ALTER TABLE base_expenses ADD COLUMN category_id INT UNSIGNED NULL AFTER category")
		if err != nil {
			return fmt.Errorf("添加category_id字段失败: %v", err)
		}
		fmt.Println("  ✓ category_id字段添加成功")
	} else {
		fmt.Println("  ✓ category_id字段已存在")
	}

	// 检查并添加外键约束
	var fkCount int
	err = db.QueryRow("SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'base_expenses' AND constraint_name = 'fk_base_expenses_category_id'").Scan(&fkCount)
	if err != nil {
		return fmt.Errorf("检查外键约束失败: %v", err)
	}

	if fkCount == 0 {
		fmt.Println("  添加外键约束...")
		_, err := db.Exec("ALTER TABLE base_expenses ADD CONSTRAINT fk_base_expenses_category_id FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL")
		if err != nil {
			// 外键可能已存在或其他原因，记录但不中断
			log.Printf("  添加外键约束失败（可能已存在）: %v", err)
		} else {
			fmt.Println("  ✓ 外键约束添加成功")
		}
	} else {
		fmt.Println("  ✓ 外键约束已存在")
	}

	// 检查并添加索引
	var indexCount int
	err = db.QueryRow("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'base_expenses' AND index_name = 'idx_base_expenses_category_id'").Scan(&indexCount)
	if err != nil {
		return fmt.Errorf("检查索引失败: %v", err)
	}

	if indexCount == 0 {
		fmt.Println("  添加索引...")
		_, err := db.Exec("CREATE INDEX idx_base_expenses_category_id ON base_expenses(category_id)")
		if err != nil {
			log.Printf("  添加索引失败: %v", err)
		} else {
			fmt.Println("  ✓ 索引添加成功")
		}
	} else {
		fmt.Println("  ✓ 索引已存在")
	}

	return nil
}

func verifyDataConsistency(db *sql.DB) error {
	fmt.Println("3. 验证数据一致性...")

	// 检查user_bases表中的孤立记录
	fmt.Println("  检查user_bases表中的孤立记录...")
	rows, err := db.Query(`
		SELECT ub.id, ub.user_id, ub.base_id
		FROM user_bases ub
		LEFT JOIN users u ON ub.user_id = u.id
		LEFT JOIN bases b ON ub.base_id = b.id
		WHERE u.id IS NULL OR b.id IS NULL
	`)
	if err != nil {
		return fmt.Errorf("检查孤立记录失败: %v", err)
	}
	defer rows.Close()

	orphanedCount := 0
	for rows.Next() {
		var id, userID, baseID int
		if err := rows.Scan(&id, &userID, &baseID); err != nil {
			continue
		}
		fmt.Printf("  发现孤立记录: ID=%d, UserID=%d, BaseID=%d\n", id, userID, baseID)
		orphanedCount++
	}

	if orphanedCount > 0 {
		fmt.Printf("  发现 %d 条孤立记录\n", orphanedCount)
	} else {
		fmt.Println("  ✓ 未发现孤立记录")
	}

	// 检查重复关联
	fmt.Println("  检查重复关联...")
	rows, err = db.Query(`
		SELECT user_id, base_id, COUNT(*) as count
		FROM user_bases
		GROUP BY user_id, base_id
		HAVING COUNT(*) > 1
	`)
	if err != nil {
		return fmt.Errorf("检查重复关联失败: %v", err)
	}
	defer rows.Close()

	duplicateCount := 0
	for rows.Next() {
		var userID, baseID, count int
		if err := rows.Scan(&userID, &baseID, &count); err != nil {
			continue
		}
		fmt.Printf("  发现重复关联: UserID=%d, BaseID=%d, Count=%d\n", userID, baseID, count)
		duplicateCount++
	}

	if duplicateCount > 0 {
		fmt.Printf("  发现 %d 个重复关联\n", duplicateCount)
	} else {
		fmt.Println("  ✓ 未发现重复关联")
	}

	// 显示统计信息
	fmt.Println("  显示统计信息...")
	var total, uniqueUsers, uniqueBases int
	err = db.QueryRow(`
		SELECT 
			(SELECT COUNT(*) FROM user_bases) as total_associations,
			(SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users,
			(SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases
	`).Scan(&total, &uniqueUsers, &uniqueBases)
	if err != nil {
		return fmt.Errorf("获取统计信息失败: %v", err)
	}

	fmt.Printf("  总关联数: %d\n", total)
	fmt.Printf("  唯一用户数: %d\n", uniqueUsers)
	fmt.Printf("  唯一基地数: %d\n", uniqueBases)

	return nil
}