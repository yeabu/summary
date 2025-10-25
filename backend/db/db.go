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
	logSnowflakeColumn("users", "id")
	// AutoMigrate the new purchase param table (safe no-op if exists)
	if err := DB.AutoMigrate(&models.ProductPurchaseParam{}); err != nil {
		log.Println("AutoMigrate ProductPurchaseParam failed:", err)
	}
}

type columnInfo struct {
	ColumnType string
	IsNullable string
	Extra      string
}

// logSnowflakeColumn logs the current column definition so operators can confirm it accepts explicit IDs.
func logSnowflakeColumn(table, column string) {
	if DB == nil {
		return
	}
	var info columnInfo
	result := DB.Raw(`
        SELECT COLUMN_TYPE, IS_NULLABLE, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    `, table, column).Scan(&info)
	if result.Error != nil {
		log.Println("warn: inspect column", table+"."+column, "failed:", result.Error)
		return
	}
	if result.RowsAffected == 0 {
		return
	}
	log.Printf("info: %s.%s column type %s (nullable=%s, extra=%s) — expecting manual Snowflake IDs.", table, column, info.ColumnType, info.IsNullable, info.Extra)
}
