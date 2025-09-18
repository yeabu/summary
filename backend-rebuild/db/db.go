package db

import (
    "log"
    "os"
    "summary/backend-rebuild/models"
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

var DB *gorm.DB

func Init() {
    dsn := os.Getenv("MYSQL_DSN")
    if dsn == "" {
        log.Fatal("MYSQL_DSN env is required")
    }
    database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("MySQL connect error: ", err)
    }
    DB = database
    // AutoMigrate purchase params table if present in this codebase
    if err := DB.AutoMigrate(&models.ProductPurchaseParam{}); err != nil {
        log.Println("AutoMigrate ProductPurchaseParam failed:", err)
    }
}
