package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

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

	// 获取一些基地ID
	var baseIDs []uint
	rows, err := db.Query("SELECT id FROM bases LIMIT 3")
	if err != nil {
		log.Fatal("查询基地ID失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id uint
		err := rows.Scan(&id)
		if err != nil {
			log.Fatal("扫描基地ID失败:", err)
		}
		baseIDs = append(baseIDs, id)
	}

	if len(baseIDs) < 3 {
		log.Fatal("基地数量不足")
	}

	// 获取一些队长用户ID
	var captainIDs []uint
	rows, err = db.Query("SELECT id FROM users WHERE role = 'captain' LIMIT 5")
	if err != nil {
		log.Fatal("查询队长用户ID失败:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id uint
		err := rows.Scan(&id)
		if err != nil {
			log.Fatal("扫描队长用户ID失败:", err)
		}
		captainIDs = append(captainIDs, id)
	}

	// 如果队长用户不足，则创建一些
	if len(captainIDs) < 5 {
		// 创建队长用户
		for i := len(captainIDs); i < 5; i++ {
			name := fmt.Sprintf("队长%d", i+1)
			role := "captain"
			base := "A基地"
			password := "password123"

			result, err := db.Exec("INSERT INTO users (name, role, base, password) VALUES (?, ?, ?, ?)",
				name, role, base, password)
			if err != nil {
				log.Fatal("插入队长用户失败:", err)
			}

			id, err := result.LastInsertId()
			if err != nil {
				log.Fatal("获取插入ID失败:", err)
			}

			captainIDs = append(captainIDs, uint(id))
		}
	}

	// 插入10条基地分区数据
	sections := []struct {
		Name        string
		BaseID      uint
		LeaderID    interface{}
		Description string
	}{
		{"1区", baseIDs[0], captainIDs[0], "A基地1区"},
		{"2区", baseIDs[0], captainIDs[1], "A基地2区"},
		{"3区", baseIDs[0], captainIDs[2], "A基地3区"},
		{"研发区", baseIDs[0], nil, "A基地研发区（暂无队长）"},
		{"测试区", baseIDs[0], nil, "A基地测试区（暂无队长）"},
		{"生产区", baseIDs[1], nil, "B基地生产区（暂无队长）"},
		{"质量区", baseIDs[1], nil, "B基地质量区（暂无队长）"},
		{"物流区", baseIDs[2], nil, "C基地物流区（暂无队长）"},
		{"4区", baseIDs[1], captainIDs[3], "B基地4区"},
		{"5区", baseIDs[2], captainIDs[4], "C基地5区"},
	}

	createdAt := time.Now()
	for _, section := range sections {
		var leaderID interface{}
		if section.LeaderID != nil {
			leaderID = section.LeaderID
		}

		_, err := db.Exec("INSERT INTO base_sections (name, base_id, leader_id, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			section.Name, section.BaseID, leaderID, section.Description, 1, createdAt, createdAt)
		if err != nil {
			log.Fatal("插入分区数据失败:", err)
		}
	}

	fmt.Println("成功插入10条基地分区数据!")
}
