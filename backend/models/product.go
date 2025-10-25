package models

import (
	"time"

	"gorm.io/gorm"
)

// Product 商品主数据（含标准基准单位）
type Product struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Name       string    `gorm:"not null;unique" json:"name"`
	BaseUnit   string    `json:"base_unit"`                            // 基准单位（如：瓶、个、公斤）
	Spec       string    `json:"spec"`                                 // 规格（如：500ml、10kg/袋）
	UnitPrice  float64   `gorm:"type:decimal(15,2)" json:"unit_price"` // 默认单价
	Currency   string    `gorm:"size:8;default:CNY" json:"currency"`
	SupplierID *uint     `json:"supplier_id,omitempty"` // 供应商外键（可选）
	Supplier   *Supplier `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Status     string    `gorm:"default:active" json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (p *Product) BeforeCreate(tx *gorm.DB) error {
	return assignSnowflakeID(&p.ID)
}
