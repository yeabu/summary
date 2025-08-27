package models

import "time"

type PurchaseEntry struct {
	ID           uint                `gorm:"primaryKey" json:"id"`
	Supplier     string              `json:"supplier"` // 供应商名称
	OrderNumber  string              `json:"order_number"`
	PurchaseDate time.Time           `json:"purchase_date"`
	TotalAmount  float64             `json:"total_amount"`
	Receiver     string              `json:"receiver"`
	Base         string              `json:"base"` // 所属基地
	CreatedBy    uint                `json:"created_by"`
	CreatorName  string              `json:"creator_name"`
	CreatedAt    time.Time           `json:"created_at"`
	UpdatedAt    time.Time           `json:"updated_at"`
	Items        []PurchaseEntryItem `gorm:"foreignKey:PurchaseEntryID" json:"items"`
}

type PurchaseEntryItem struct {
	ID              uint    `gorm:"primaryKey" json:"id"`
	PurchaseEntryID uint    `json:"purchase_entry_id"`
	ProductName     string  `json:"product_name"`
	Quantity        float64 `json:"quantity"`
	UnitPrice       float64 `json:"unit_price"`
	Amount          float64 `json:"amount"`
}
