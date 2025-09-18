package models

import "time"

type Supplier struct {
    ID             uint      `gorm:"primaryKey" json:"id"`
    Name           string    `gorm:"size:191;unique;not null" json:"name"`
    ContactPerson  string    `json:"contact_person"`
    Phone          string    `json:"phone"`
    Email          string    `json:"email"`
    Address        string    `json:"address"`
    SettlementType string    `gorm:"size:20;default:'flexible'" json:"settlement_type"`
    SettlementDay  *int      `json:"settlement_day"`
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}
