package db

import (
    "log"
    "os"
    "backend/models"
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
    // AutoMigrate the new purchase param table (safe no-op if exists)
    if err := DB.AutoMigrate(&models.ProductPurchaseParam{}); err != nil {
        log.Println("AutoMigrate ProductPurchaseParam failed:", err)
    }
}
