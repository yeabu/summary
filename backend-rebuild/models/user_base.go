package models

import "time"

// UserBase uses a composite primary key (user_id, base_id) to match existing schema
type UserBase struct {
    UserID   uint      `gorm:"primaryKey;autoIncrement:false" json:"user_id"`
    BaseID   uint      `gorm:"primaryKey;autoIncrement:false" json:"base_id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
