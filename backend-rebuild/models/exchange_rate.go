package models

type ExchangeRate struct {
    ID        uint    `gorm:"primaryKey" json:"id"`
    Currency  string  `gorm:"unique;size:8;not null" json:"currency"`
    RateToCNY float64 `gorm:"type:decimal(18,6);not null" json:"rate_to_cny"`
}

