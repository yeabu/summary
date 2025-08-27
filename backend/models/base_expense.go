package models

import "time"

type BaseExpense struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Base        string    `json:"base"`     // 所属基地
	Date        time.Time `json:"date"`     // 发生日期
	Category    string    `json:"category"` // 费用类别
	Amount      float64   `json:"amount"`
	Detail      string    `json:"detail"`
	CreatedBy   uint      `json:"created_by"`
	CreatorName string    `json:"creator_name"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
