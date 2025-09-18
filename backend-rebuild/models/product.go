package models

import "time"

type Product struct {
    ID         uint      `gorm:"primaryKey" json:"id"`
    Name       string    `gorm:"size:191;not null;unique" json:"name"`
    CategoryID *uint     `json:"category_id,omitempty"`
    Unit       string    `json:"unit"` // legacy default unit (kept for comp.)
    BaseUnit   string    `json:"base_unit"` // 标准基准单位（如：瓶、公斤、个）
    Status     string    `gorm:"default:active" json:"status"`
    CreatedAt  time.Time `json:"created_at"`
    UpdatedAt  time.Time `json:"updated_at"`
}

type SupplierProduct struct {
    ID               uint      `gorm:"primaryKey" json:"id"`
    SupplierID       uint      `gorm:"index;not null;uniqueIndex:uidx_supplier_product,priority:1" json:"supplier_id"`
    ProductID        uint      `gorm:"index;not null;uniqueIndex:uidx_supplier_product,priority:2" json:"product_id"`
    DefaultUnitPrice float64   `gorm:"type:decimal(15,2);not null;default:0" json:"default_unit_price"`
    Currency         string    `gorm:"size:8;default:'CNY'" json:"currency"`
    Status           string    `gorm:"default:active" json:"status"`
    CreatedAt        time.Time `json:"created_at"`
    UpdatedAt        time.Time `json:"updated_at"`
}

type SupplierProductPrice struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    SupplierID  uint      `gorm:"index:idx_spp_sp_from,priority:1;not null" json:"supplier_id"`
    ProductID   uint      `gorm:"index:idx_spp_sp_from,priority:2;not null" json:"product_id"`
    Price       float64   `gorm:"type:decimal(15,2);not null" json:"price"`
    Currency    string    `gorm:"size:8;default:'CNY'" json:"currency"`
    EffectiveFrom time.Time `gorm:"type:date;not null;index:idx_spp_sp_from,priority:3" json:"effective_from"`
    EffectiveTo   *time.Time `gorm:"type:date" json:"effective_to"`
    CreatedAt   time.Time `json:"created_at"`
}
