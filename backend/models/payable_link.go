package models

import "time"

// PayableLink 关联应付款与采购记录的链接（支持一个应付款聚合多条采购）
type PayableLink struct {
    ID              uint           `gorm:"primaryKey" json:"id"`
    PayableRecordID uint           `gorm:"index;not null" json:"payable_record_id"`
    PurchaseEntryID uint           `gorm:"index;not null" json:"purchase_entry_id"`
    // 计入本次应付款的金额，默认等于采购单总额；也可用于部分计入
    Amount          float64        `gorm:"type:decimal(15,2);not null" json:"amount"`
    Currency        string         `gorm:"size:8;default:CNY" json:"currency"`

    // 关联数据
    PurchaseEntry   PurchaseEntry  `gorm:"foreignKey:PurchaseEntryID" json:"purchase_entry"`

    CreatedAt       time.Time      `json:"created_at"`
}
