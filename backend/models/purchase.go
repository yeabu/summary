package models

import "time"

type PurchaseEntry struct {
	ID           uint                `gorm:"primaryKey" json:"id"`
	SupplierID   *uint               `gorm:"foreignKey:SupplierID" json:"supplier_id,omitempty"` // 供应商ID
	Supplier     *Supplier           `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`    // 关联的供应商
	OrderNumber  string              `json:"order_number"`
	PurchaseDate time.Time           `json:"purchase_date"`
	TotalAmount  float64             `json:"total_amount"`
	Receiver     string              `json:"receiver"`
	BaseID       uint                `gorm:"not null" json:"base_id"`       // 所属基地ID
	Base         Base                `gorm:"foreignKey:BaseID" json:"base"` // 关联的基地
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
    Unit            string  `json:"unit,omitempty"`
    Quantity        float64 `json:"quantity"`
    UnitPrice       float64 `json:"unit_price"`
    Amount          float64 `json:"amount"`
    QuantityBase    float64 `json:"quantity_base,omitempty"`
}
