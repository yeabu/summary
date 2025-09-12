package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// 连接数据库
	db, err := sql.Open("mysql", "root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 检查连接
	err = db.Ping()
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	fmt.Println("开始数据库优化...")

	// 1. 创建suppliers表
	fmt.Println("1. 创建suppliers表...")
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS suppliers (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL UNIQUE,
			contact_person VARCHAR(255),
			phone VARCHAR(50),
			email VARCHAR(255),
			address TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`)
	if err != nil {
		log.Fatal("创建suppliers表失败:", err)
	}
	fmt.Println("   suppliers表创建成功")

	// 2. 修改users表，添加base_id字段并设置外键
	fmt.Println("2. 修改users表...")
	_, err = db.Exec("ALTER TABLE users ADD COLUMN base_id BIGINT UNSIGNED AFTER role")
	if err != nil {
		// 如果字段已存在，忽略错误
		fmt.Println("   base_id字段已存在或添加失败:", err)
	} else {
		fmt.Println("   base_id字段添加成功")
	}

	// 为users表的base_id字段添加外键约束
	_, err = db.Exec("ALTER TABLE users ADD CONSTRAINT fk_users_base FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE SET NULL")
	if err != nil {
		// 如果外键已存在，忽略错误
		fmt.Println("   外键约束已存在或添加失败:", err)
	} else {
		fmt.Println("   外键约束添加成功")
	}

	// 3. 修改base_expenses表，删除重复的base字段
	fmt.Println("3. 修改base_expenses表...")
	_, err = db.Exec("ALTER TABLE base_expenses DROP COLUMN base")
	if err != nil {
		// 如果字段不存在，忽略错误
		fmt.Println("   base字段不存在或删除失败:", err)
	} else {
		fmt.Println("   base字段删除成功")
	}

	// 4. 修改purchase_entries表，添加supplier_id字段
	fmt.Println("4. 修改purchase_entries表...")
	_, err = db.Exec("ALTER TABLE purchase_entries ADD COLUMN supplier_id BIGINT UNSIGNED AFTER supplier")
	if err != nil {
		// 如果字段已存在，忽略错误
		fmt.Println("   supplier_id字段已存在或添加失败:", err)
	} else {
		fmt.Println("   supplier_id字段添加成功")
	}

	// 为purchase_entries表的supplier_id字段添加外键约束
	_, err = db.Exec("ALTER TABLE purchase_entries ADD CONSTRAINT fk_purchase_entries_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL")
	if err != nil {
		// 如果外键已存在，忽略错误
		fmt.Println("   外键约束已存在或添加失败:", err)
	} else {
		fmt.Println("   外键约束添加成功")
	}

	// 5. 修改payable_records表，添加supplier_id字段
	fmt.Println("5. 修改payable_records表...")
	_, err = db.Exec("ALTER TABLE payable_records ADD COLUMN supplier_id BIGINT UNSIGNED AFTER supplier")
	if err != nil {
		// 如果字段已存在，忽略错误
		fmt.Println("   supplier_id字段已存在或添加失败:", err)
	} else {
		fmt.Println("   supplier_id字段添加成功")
	}

	// 为payable_records表的supplier_id字段添加外键约束
	_, err = db.Exec("ALTER TABLE payable_records ADD CONSTRAINT fk_payable_records_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL")
	if err != nil {
		// 如果外键已存在，忽略错误
		fmt.Println("   外键约束已存在或添加失败:", err)
	} else {
		fmt.Println("   外键约束添加成功")
	}

	fmt.Println("数据库优化完成！")
}
