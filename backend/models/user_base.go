package models

import (
	"time"

	"backend/idgen"
	"gorm.io/gorm"
)

// UserBase 用户与基地关联模型
// 用于实现用户与基地的多对多关系
type UserBase struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"not null;index:idx_user_base,priority:1"` // 用户ID
	BaseID    uint      `gorm:"not null;index:idx_user_base,priority:2"` // 基地ID
	User      User      `gorm:"foreignKey:UserID"`                       // 关联的用户
	Base      Base      `gorm:"foreignKey:BaseID"`                       // 关联的基地
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名
func (UserBase) TableName() string {
	return "user_bases"
}

func (ub *UserBase) BeforeCreate(tx *gorm.DB) error {
	if ub.ID != 0 {
		return nil
	}
	id, err := idgen.NextIDUint()
	if err != nil {
		return err
	}
	ub.ID = id
	return nil
}
