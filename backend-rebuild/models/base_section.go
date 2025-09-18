package models

import "time"

type BaseSection struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    Name        string    `gorm:"not null" json:"name"`
    BaseID      uint      `gorm:"index;not null" json:"base_id"`
    Base        Base      `gorm:"foreignKey:BaseID" json:"-"`
    LeaderID    *uint     `json:"leader_id"`
    Leader      *User     `gorm:"foreignKey:LeaderID" json:"-"`
    Description string    `json:"description"`
    CreatedBy   uint      `json:"created_by"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

