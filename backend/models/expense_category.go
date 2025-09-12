package models

import (
	"time"
)

type ExpenseCategory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null;unique;size:50" json:"name"`    // 类别名称
	Code      string    `gorm:"size:20;unique" json:"code"`             // 类别代码
	Status    string    `gorm:"size:20;default:'active'" json:"status"` // 状态: active/inactive
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
