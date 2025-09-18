package models

import "time"

type Base struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    Name        string    `gorm:"size:191;unique;not null" json:"name"`
    Code        string    `gorm:"size:64;unique;not null" json:"code"`
    Location    string    `json:"location"`
    Description string    `json:"description"`
    Status      string    `gorm:"default:active" json:"status"`
    CreatedBy   uint      `json:"created_by"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
