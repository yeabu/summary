package models

import "time"

type PayableLink struct {
    ID              uint           `gorm:"primaryKey" json:"id"`
    PayableRecordID uint           `gorm:"index;not null;uniqueIndex:uidx_pl_payable_purchase,priority:1" json:"payable_record_id"`
    PurchaseEntryID uint           `gorm:"index;not null;uniqueIndex:uidx_pl_payable_purchase,priority:2" json:"purchase_entry_id"`
    Amount          float64        `gorm:"type:decimal(15,2);not null" json:"amount"`
    Currency        string         `gorm:"size:8;default:'CNY'" json:"currency"`
    PurchaseEntry   PurchaseEntry  `gorm:"foreignKey:PurchaseEntryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"purchase_entry"`
    CreatedAt       time.Time      `json:"created_at"`
}
