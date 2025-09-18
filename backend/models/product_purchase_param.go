package models

import "time"

// ProductPurchaseParam 每个商品的采购参数（唯一）
// 包含：采购单位、到基准单位换算系数、采购单价
type ProductPurchaseParam struct {
    ID            uint      `gorm:"primaryKey" json:"id"`
    ProductID     uint      `gorm:"uniqueIndex;not null" json:"product_id"`
    Unit          string    `gorm:"size:32;not null" json:"unit"`
    FactorToBase  float64   `gorm:"not null" json:"factor_to_base"`
    PurchasePrice float64   `gorm:"type:decimal(15,2);not null" json:"purchase_price"`
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
}

