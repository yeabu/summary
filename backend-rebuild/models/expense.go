package models

import "time"

type ExpenseCategory struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Name      string    `gorm:"size:50;unique;not null" json:"name"`
    Status    string    `gorm:"default:active" json:"status"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type BaseExpense struct {
    ID          uint            `gorm:"primaryKey" json:"id"`
    BaseID      uint            `gorm:"index;not null" json:"base_id"`
    Base        Base            `gorm:"foreignKey:BaseID" json:"base"`
    Date        time.Time       `gorm:"type:date;index" json:"date"`
    CategoryID  uint            `gorm:"index;not null" json:"category_id"`
    Category    ExpenseCategory `gorm:"foreignKey:CategoryID" json:"category"`
    Amount      float64         `json:"amount"`
    Currency    string          `gorm:"size:8;default:'CNY'" json:"currency"`
    Detail      string          `json:"detail"`
    CreatedBy   uint            `json:"created_by"`
    CreatorName string          `json:"creator_name"`
    CreatedAt   time.Time       `json:"created_at"`
    UpdatedAt   time.Time       `json:"updated_at"`
}
