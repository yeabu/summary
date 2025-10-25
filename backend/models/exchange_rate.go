package models

import (
	"time"

	"gorm.io/gorm"
)

// ExchangeRate 记录外币兑人民币的汇率（1 外币 = rate_to_cny 人民币）
type ExchangeRate struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Currency  string    `gorm:"unique;size:8;not null" json:"currency"` // LAK, THB
	RateToCNY float64   `gorm:"type:decimal(18,6);not null" json:"rate_to_cny"`
	UpdatedAt time.Time `json:"updated_at"`
	CreatedAt time.Time `json:"created_at"`
}

func (er *ExchangeRate) BeforeCreate(tx *gorm.DB) error {
	return assignSnowflakeID(&er.ID)
}
