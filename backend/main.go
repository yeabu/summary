package main

import (
	"backend/db"
	"backend/idgen"
	"backend/models"
	"backend/routes"
	"bufio"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func loadEnv() {
	file, err := os.Open(".env")
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if os.Getenv(key) == "" {
				os.Setenv(key, value)
			}
		}
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,Origin")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	// 加载 .env 文件
	loadEnv()

	idgen.MustInitFromEnv()
	db.Init()
	db.DB.AutoMigrate(
		&models.User{},
		&models.UserBase{},
		&models.Base{},
		&models.BaseSection{},
		&models.Product{},
		&models.ProductUnitSpec{},
		&models.PurchaseEntry{},
		&models.PurchaseEntryItem{},
		&models.BaseExpense{},
		&models.PayableRecord{},
		&models.PayableLink{},
		&models.PaymentRecord{},
		&models.ExpenseCategory{},
		&models.Supplier{},
		&models.MaterialRequisition{},
		&models.ExchangeRate{},
	)
	ensureUserBaseSchema()

	// Seed default exchange rates if missing
	// LAK:CNY = 3000:1 => 1 LAK = 1/3000 CNY
	// THB:CNY = 4.47:1 => 1 THB = 1/4.47 CNY
	var cnt int64
	db.DB.Model(&models.ExchangeRate{}).Where("currency = ?", "LAK").Count(&cnt)
	if cnt == 0 {
		db.DB.Create(&models.ExchangeRate{Currency: "LAK", RateToCNY: 1.0 / 3000.0})
	}
	db.DB.Model(&models.ExchangeRate{}).Where("currency = ?", "THB").Count(&cnt)
	if cnt == 0 {
		db.DB.Create(&models.ExchangeRate{Currency: "THB", RateToCNY: 1.0 / 4.47})
	}

	// Seed default admin user if not exists
	var userCnt int64
	db.DB.Model(&models.User{}).Where("name = ?", "admin").Count(&userCnt)
	if userCnt == 0 {
		hash, _ := bcrypt.GenerateFromPassword([]byte("admin123456"), bcrypt.DefaultCost)
		u := models.User{
			Name:      "admin",
			Role:      "admin",
			Password:  string(hash),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := db.DB.Create(&u).Error; err != nil {
			log.Println("warn: seed admin user failed:", err)
		} else {
			log.Println("seeded default admin user: admin / admin123456")
		}
	}
	addr := ":8080"
	if os.Getenv("PORT") != "" {
		addr = ":" + os.Getenv("PORT")
	}
	handler := corsMiddleware(routes.SetupRouter())
	log.Println("Go backend started: http://localhost" + addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}

func ensureUserBaseSchema() {
	migrator := db.DB.Migrator()
	if !migrator.HasTable(&models.UserBase{}) {
		if err := migrator.CreateTable(&models.UserBase{}); err != nil {
			log.Println("error: failed to create user_bases table:", err)
			return
		}
		log.Println("info: created user_bases table")
	}

	if !migrator.HasColumn(&models.UserBase{}, "created_at") {
		if err := migrator.AddColumn(&models.UserBase{}, "CreatedAt"); err != nil {
			log.Println("error: add user_bases.created_at column failed:", err)
		} else {
			log.Println("info: added user_bases.created_at column")
		}
	}
	if !migrator.HasColumn(&models.UserBase{}, "updated_at") {
		if err := migrator.AddColumn(&models.UserBase{}, "UpdatedAt"); err != nil {
			log.Println("error: add user_bases.updated_at column failed:", err)
		} else {
			log.Println("info: added user_bases.updated_at column")
		}
	}

	if !migrator.HasColumn(&models.UserBase{}, "id") {
		log.Println("info: user_bases.id column missing — snowflake IDs expect a BIGINT column; please add one manually when ready.")
	}
	if !migrator.HasIndex(&models.UserBase{}, "idx_user_base") {
		if err := migrator.CreateIndex(&models.UserBase{}, "idx_user_base"); err != nil {
			log.Println("error: create user_bases idx_user_base index failed:", err)
		} else {
			log.Println("info: ensured user_bases idx_user_base unique index")
		}
	}
}
