package models

import (
	"time"

	"gorm.io/gorm"
)

// BaseSection 基地区域模型
type BaseSection struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null" json:"name"`         // 分区名称，如"1区"、"2区"
	BaseID      uint      `gorm:"not null" json:"base_id"`      // 所属基地ID
	Base        Base      `gorm:"foreignKey:BaseID" json:"-"`   // 关联的基地
	LeaderID    *uint     `json:"leader_id"`                    // 队长用户ID（可为空）
	Leader      *User     `gorm:"foreignKey:LeaderID" json:"-"` // 关联的队长用户
	Description string    `json:"description"`                  // 分区描述
	CreatedBy   uint      `json:"created_by"`                   // 创建人ID
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (bs *BaseSection) BeforeCreate(tx *gorm.DB) error {
	return assignSnowflakeID(&bs.ID)
}
