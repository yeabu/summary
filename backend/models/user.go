package models

import "time"

type User struct {
	ID             uint       `gorm:"primaryKey"`
	Name           string     `gorm:"unique"`
	Role           string     // "admin", "base_agent", "captain", "factory_manager"
	Base           string     // 所属基地
	Password       string     // bcrypt hash
	JoinDate       *time.Time `json:"join_date,omitempty"`        // 入司时间
	Mobile         string     `json:"mobile,omitempty"`           // 手机号
	PassportNumber string     `json:"passport_number,omitempty"`  // 护照号
	VisaExpiryDate *time.Time `json:"visa_expiry_date,omitempty"` // 签证到期时间
}
