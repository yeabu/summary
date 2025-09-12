package models

import "time"

type User struct {
	ID             uint       `gorm:"primaryKey"`
	Name           string     `gorm:"unique"`
	Role           string     // "admin", "base_agent", "captain", "factory_manager"
	Password       string     // bcrypt hash
	JoinDate       *time.Time `json:"join_date,omitempty"`                          // 入司时间
	Mobile         string     `json:"mobile,omitempty"`                             // 手机号
	PassportNumber string     `json:"passport_number,omitempty"`                    // 护照号
	VisaExpiryDate *time.Time `json:"visa_expiry_date,omitempty"`                   // 签证到期时间
	UserBases      []UserBase `gorm:"foreignKey:UserID" json:"-"`                   // 用户与基地的关联关系
	Bases          []Base     `gorm:"many2many:user_bases;" json:"bases,omitempty"` // 关联的基地列表
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
