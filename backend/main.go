package main

import (
	"backend/db"
	"backend/models"
	"backend/routes"
	"bufio"
	"log"
	"net/http"
	"os"
	"strings"
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

    db.Init()
    db.DB.AutoMigrate(
        &models.User{},
        &models.Base{},
        &models.BaseSection{},
        &models.PurchaseEntry{},
        &models.PurchaseEntryItem{},
        &models.BaseExpense{},
        &models.PayableRecord{},
        &models.PayableLink{},
        &models.PaymentRecord{},
        &models.ExpenseCategory{},
        &models.Supplier{},
    )
	addr := ":8080"
	if os.Getenv("PORT") != "" {
		addr = ":" + os.Getenv("PORT")
	}
	handler := corsMiddleware(routes.SetupRouter())
	log.Println("Go backend started: http://localhost" + addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}
