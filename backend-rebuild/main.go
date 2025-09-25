package main

import (
    "bufio"
    "log"
    "net/http"
    "os"
    "strings"
    "time"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
    "summary/backend-rebuild/routes"
    "summary/backend-rebuild/handlers"
)

func loadEnv() {
    f, err := os.Open(".env")
    if err != nil { return }
    defer f.Close()
    s := bufio.NewScanner(f)
    for s.Scan() {
        line := strings.TrimSpace(s.Text())
        if line == "" || strings.HasPrefix(line, "#") { continue }
        parts := strings.SplitN(line, "=", 2)
        if len(parts) == 2 {
            k := strings.TrimSpace(parts[0])
            v := strings.TrimSpace(parts[1])
            if os.Getenv(k) == "" { os.Setenv(k, v) }
        }
    }
}

func main() {
    // load local .env if present
    loadEnv()
    db.Init()
    if err := db.DB.AutoMigrate(
        &models.Base{},
        &models.BaseSection{},
        &models.User{},
        &models.Supplier{},
        &models.Product{},
        &models.SupplierProduct{},
        &models.SupplierProductPrice{},
        &models.ProductUnitSpec{},
        &models.PurchaseEntry{},
        &models.PurchaseEntryItem{},
        &models.IdempotencyKey{},
        &models.ExpenseCategory{},
        &models.BaseExpense{},
        &models.UserBase{},
        &models.PayableRecord{},
        &models.PayableLink{},
        &models.PaymentRecord{},
        &models.ExchangeRate{},
    ); err != nil {
        log.Fatal("automigrate error:", err)
    }

    // seed default exchange rates if missing
    var cnt int64
    db.DB.Model(&models.ExchangeRate{}).Where("currency = ?", "LAK").Count(&cnt)
    if cnt == 0 {
        db.DB.Create(&models.ExchangeRate{Currency: "LAK", RateToCNY: 1.0/3000.0})
    }
    db.DB.Model(&models.ExchangeRate{}).Where("currency = ?", "THB").Count(&cnt)
    if cnt == 0 {
        db.DB.Create(&models.ExchangeRate{Currency: "THB", RateToCNY: 1.0/4.47})
    }

    mux := routes.SetupRouter()
    // CORS middleware (allow frontend at localhost:3000 and others)
    corsMiddleware := func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Allow all origins by default; adjust if needed
            w.Header().Set("Access-Control-Allow-Origin", "*")
            w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,Origin")
            if r.Method == http.MethodOptions {
                w.WriteHeader(http.StatusNoContent)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
    // Optional background MV refresh
    if iv := os.Getenv("MV_REFRESH_INTERVAL"); iv != "" {
        if d, err := time.ParseDuration(iv); err == nil && d > 0 {
            go func() {
                ticker := time.NewTicker(d)
                defer ticker.Stop()
                for range ticker.C {
                    m := time.Now().Format("2006-01")
                    _ = handlers.RecomputeMonthly(m)
                }
            }()
        }
    }
    addr := os.Getenv("PORT")
    if addr == "" { addr = ":8080" }
    handler := corsMiddleware(mux)
    log.Println("backend-rebuild running on", addr)
    log.Fatal(http.ListenAndServe(addr, handler))
}
