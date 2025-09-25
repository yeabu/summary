package models

import "time"

type PurchaseEntry struct {
    ID           uint                `gorm:"primaryKey" json:"id"`
    SupplierID   *uint               `gorm:"index:idx_pe_supplier_base_date,priority:1" json:"supplier_id,omitempty"`
    Supplier     *Supplier           `gorm:"foreignKey:SupplierID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"supplier,omitempty"`
    OrderNumber  string              `json:"order_number"`
    PurchaseDate time.Time           `gorm:"index:idx_pe_supplier_base_date,priority:3" json:"purchase_date"`
    TotalAmount  float64             `json:"total_amount"`
    Currency     string              `gorm:"size:8;default:'CNY'" json:"currency"`
    Receiver     string              `json:"receiver"`
    BaseID       uint                `gorm:"index:idx_pe_supplier_base_date,priority:2;not null" json:"base_id"`
    Base         Base                `gorm:"foreignKey:BaseID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"base"`
    CreatedBy    uint                `json:"created_by"`
    CreatorName  string              `json:"creator_name"`
    CreatedAt    time.Time           `json:"created_at"`
    UpdatedAt    time.Time           `json:"updated_at"`
    Items        []PurchaseEntryItem `gorm:"foreignKey:PurchaseEntryID;constraint:OnDelete:CASCADE" json:"items"`
}

type PurchaseEntryItem struct {
    ID              uint    `gorm:"primaryKey" json:"id"`
    PurchaseEntryID uint    `gorm:"index;not null" json:"purchase_entry_id"`
    ProductID       *uint   `gorm:"index" json:"product_id,omitempty"`
    ProductName     string  `json:"product_name"`
    Unit            string  `json:"unit"`          // 采购记录使用的单位（如：箱、袋、吨）
    Quantity        float64 `json:"quantity"`
    UnitPrice       float64 `json:"unit_price"`
    Amount          float64 `json:"amount"`
    QuantityBase    float64 `json:"quantity_base"` // 按商品基准单位折算后的数量（如：瓶）
}
