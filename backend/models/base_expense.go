package models

import "time"

type BaseExpense struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	BaseID      *uint           `gorm:"" json:"base_id,omitempty"`             // 所属基地ID (可选)
	Base        *Base           `gorm:"foreignKey:BaseID" json:"base,omitempty"` // 关联的基地 (可选)
	Date        time.Time       `json:"date"`                                  // 发生日期
	CategoryID  uint            `gorm:"not null" json:"category_id"`           // 费用类别ID
	Category    ExpenseCategory `gorm:"foreignKey:CategoryID" json:"category"` // 关联的费用类别
    Amount      float64         `json:"amount"`
    Currency    string          `gorm:"size:8;default:CNY" json:"currency"`
    Detail      string          `json:"detail"`
    CreatedBy   uint            `json:"created_by"`
    CreatorName string          `json:"creator_name"`
    CreatedAt   time.Time       `json:"created_at"`
    UpdatedAt   time.Time       `json:"updated_at"`
    ReceiptPath string          `gorm:"size:255" json:"receipt_path,omitempty"` // 票据相对路径，例如 /upload/2025-09-25/xxxxx.jpg
}
