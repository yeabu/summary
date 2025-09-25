package models

import "time"

// MaterialRequisition 物资申领记录（单条记录即一条申领明细）
// 为简化使用场景，每次申领一类商品，支持按任意单位录入，内部按基准单位存储。
type MaterialRequisition struct {
    ID            uint      `gorm:"primaryKey" json:"id"`
    BaseID        uint      `gorm:"index;not null" json:"base_id"`
    Base          Base      `gorm:"foreignKey:BaseID" json:"base"`
    ProductID     uint      `gorm:"index;not null" json:"product_id"`
    Product       Product   `gorm:"foreignKey:ProductID" json:"product"`
    ProductName   string    `gorm:"size:255;not null" json:"product_name"` // 冗余，便于报表
    UnitPrice     float64   `gorm:"type:decimal(15,2);not null" json:"unit_price"`
    QuantityBase  float64   `gorm:"not null" json:"quantity_base"` // 按商品基准单位的数量
    TotalAmount   float64   `gorm:"type:decimal(15,2);not null" json:"total_amount"`
    Currency      string    `gorm:"size:8;default:CNY" json:"currency"`
    RequestDate   time.Time `gorm:"type:date;not null" json:"request_date"`
    RequestedBy   uint      `gorm:"index;not null" json:"requested_by"`
    Requester     User      `gorm:"foreignKey:RequestedBy" json:"requester"`
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
    ReceiptPath   string    `gorm:"size:255" json:"receipt_path,omitempty"`
}
