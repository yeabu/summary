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

	fmt.Println("开始数据迁移...")

	// 1. 迁移users表的base数据到base_id
	fmt.Println("1. 迁移users表的base数据到base_id...")
	rows, err := db.Query("SELECT id, base FROM users WHERE base IS NOT NULL AND base != ''")
	if err != nil {
		log.Fatal("查询users表失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int64
		var baseName string
		err := rows.Scan(&id, &baseName)
		if err != nil {
			log.Fatal("扫描users表数据失败:", err)
		}

		// 查找对应的base_id
		var baseID int64
		err = db.QueryRow("SELECT id FROM bases WHERE name = ?", baseName).Scan(&baseID)
		if err != nil {
			if err == sql.ErrNoRows {
				fmt.Printf("   警告: 未找到基地 '%s' 对应的记录，跳过用户ID %d\n", baseName, id)
				continue
			} else {
				log.Fatal("查询bases表失败:", err)
			}
		}

		// 更新users表
		_, err = db.Exec("UPDATE users SET base_id = ? WHERE id = ?", baseID, id)
		if err != nil {
			log.Fatal("更新users表失败:", err)
		}
		fmt.Printf("   用户ID %d 的基地已更新为基地ID %d\n", id, baseID)
	}

	// 2. 迁移purchase_entries表的supplier数据到supplier_id
	fmt.Println("2. 迁移purchase_entries表的supplier数据到supplier_id...")
	rows, err = db.Query("SELECT id, supplier FROM purchase_entries WHERE supplier IS NOT NULL AND supplier != ''")
	if err != nil {
		log.Fatal("查询purchase_entries表失败:", err)
	}
	defer rows.Close()

	// 用于跟踪已创建的供应商
	createdSuppliers := make(map[string]int64)

	for rows.Next() {
		var id int64
		var supplierName string
		err := rows.Scan(&id, &supplierName)
		if err != nil {
			log.Fatal("扫描purchase_entries表数据失败:", err)
		}

		// 检查供应商是否已创建
		supplierID, exists := createdSuppliers[supplierName]
		if !exists {
			// 检查供应商是否已存在于suppliers表中
			err = db.QueryRow("SELECT id FROM suppliers WHERE name = ?", supplierName).Scan(&supplierID)
			if err != nil {
				if err == sql.ErrNoRows {
					// 供应商不存在，创建新供应商
					result, err := db.Exec("INSERT INTO suppliers (name) VALUES (?)", supplierName)
					if err != nil {
						log.Fatal("创建供应商失败:", err)
					}
					supplierID, err = result.LastInsertId()
					if err != nil {
						log.Fatal("获取新供应商ID失败:", err)
					}
					fmt.Printf("   创建新供应商: %s (ID: %d)\n", supplierName, supplierID)
				} else {
					log.Fatal("查询suppliers表失败:", err)
				}
			} else {
				fmt.Printf("   供应商已存在: %s (ID: %d)\n", supplierName, supplierID)
			}
			createdSuppliers[supplierName] = supplierID
		}

		// 更新purchase_entries表
		_, err = db.Exec("UPDATE purchase_entries SET supplier_id = ? WHERE id = ?", supplierID, id)
		if err != nil {
			log.Fatal("更新purchase_entries表失败:", err)
		}
		fmt.Printf("   采购记录ID %d 的供应商已更新为供应商ID %d\n", id, supplierID)
	}

	// 3. 迁移payable_records表的supplier数据到supplier_id
	fmt.Println("3. 迁移payable_records表的supplier数据到supplier_id...")
	rows, err = db.Query("SELECT id, supplier FROM payable_records WHERE supplier IS NOT NULL AND supplier != ''")
	if err != nil {
		log.Fatal("查询payable_records表失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int64
		var supplierName string
		err := rows.Scan(&id, &supplierName)
		if err != nil {
			log.Fatal("扫描payable_records表数据失败:", err)
		}

		// 检查供应商是否已创建
		supplierID, exists := createdSuppliers[supplierName]
		if !exists {
			// 检查供应商是否已存在于suppliers表中
			err = db.QueryRow("SELECT id FROM suppliers WHERE name = ?", supplierName).Scan(&supplierID)
			if err != nil {
				if err == sql.ErrNoRows {
					// 供应商不存在，创建新供应商
					result, err := db.Exec("INSERT INTO suppliers (name) VALUES (?)", supplierName)
					if err != nil {
						log.Fatal("创建供应商失败:", err)
					}
					supplierID, err = result.LastInsertId()
					if err != nil {
						log.Fatal("获取新供应商ID失败:", err)
					}
					fmt.Printf("   创建新供应商: %s (ID: %d)\n", supplierName, supplierID)
				} else {
					log.Fatal("查询suppliers表失败:", err)
				}
			} else {
				fmt.Printf("   供应商已存在: %s (ID: %d)\n", supplierName, supplierID)
			}
			createdSuppliers[supplierName] = supplierID
		}

		// 更新payable_records表
		_, err = db.Exec("UPDATE payable_records SET supplier_id = ? WHERE id = ?", supplierID, id)
		if err != nil {
			log.Fatal("更新payable_records表失败:", err)
		}
		fmt.Printf("   应付款记录ID %d 的供应商已更新为供应商ID %d\n", id, supplierID)
	}

	fmt.Println("数据迁移完成！")
}
