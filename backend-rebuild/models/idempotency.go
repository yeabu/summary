package models

import "time"

// IdempotencyKey stores processed keys to make create operations idempotent
type IdempotencyKey struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Key       string    `gorm:"uniqueIndex;size:128;not null" json:"key"`
    Resource  string    `gorm:"size:64;not null" json:"resource"` // e.g., "purchase", "payment"
    RefID     uint      `json:"ref_id"`                              // created record id
    CreatedAt time.Time `json:"created_at"`
}

