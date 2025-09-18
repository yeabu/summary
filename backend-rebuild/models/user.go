package models

import "time"

type User struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Name      string    `gorm:"unique" json:"name"`
    Role      string    `json:"role"`
    Password  string    `json:"-"`
    // Optional profile fields to match legacy API
    JoinDate       *time.Time `json:"join_date,omitempty"`
    Mobile         string     `json:"mobile,omitempty"`
    PassportNumber string     `json:"passport_number,omitempty"`
    VisaExpiryDate *time.Time `json:"visa_expiry_date,omitempty"`
    // Many-to-many mapping to bases
    Bases    []Base `gorm:"many2many:user_bases;" json:"bases,omitempty"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
