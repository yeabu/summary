package models

import (
	"time"

	"backend/idgen"
	"gorm.io/gorm"
)

type User struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	Name             string     `gorm:"unique" json:"name"`
	Role             string     `json:"role"`
	Password         string     `json:"-"`
	JoinDate         *time.Time `json:"join_date,omitempty"`
	Phone            string     `gorm:"column:mobile" json:"phone,omitempty"`
	Email            string     `gorm:"column:email" json:"email,omitempty"`
	VisaType         string     `gorm:"column:visa_type" json:"visa_type,omitempty"`
	PassportNumber   string     `gorm:"column:passport_number" json:"passport_number,omitempty"`
	VisaExpiryDate   *time.Time `gorm:"column:visa_expiry_date" json:"visa_expiry_date,omitempty"`
	IDCard           string     `gorm:"column:id_card" json:"id_card,omitempty"`
	EmergencyContact string     `gorm:"column:emergency_contact" json:"emergency_contact,omitempty"`
	EmergencyPhone   string     `gorm:"column:emergency_phone" json:"emergency_phone,omitempty"`
	Remark           string     `gorm:"column:remark" json:"remark,omitempty"`
	UserBases        []UserBase `gorm:"foreignKey:UserID" json:"-"`
	Bases            []Base     `gorm:"many2many:user_bases;" json:"bases,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID != 0 {
		return nil
	}
	id, err := idgen.NextIDUint()
	if err != nil {
		return err
	}
	u.ID = id
	return nil
}
