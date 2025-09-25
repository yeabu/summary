package models

import "time"

// Base 基地信息模型
type Base struct {
    ID          uint          `gorm:"primaryKey" json:"id"`
    Name        string        `gorm:"unique;not null" json:"name"`    // 基地名称
    Code        string        `gorm:"unique;not null" json:"code"`    // 基地代码
    Location    string        `json:"location"`                       // 基地位置
    Description string        `json:"description"`                    // 基地描述
    Status      string        `gorm:"default:active" json:"status"`   // 状态：active, inactive
    Currency    string        `gorm:"size:8;default:CNY" json:"currency"` // 记账币种：CNY/LAK/THB
	Sections    []BaseSection `gorm:"foreignKey:BaseID" json:"-"`     // 关联的分区
	Users       []User        `gorm:"many2many:user_bases;" json:"-"` // 关联的用户列表
	CreatedBy   uint          `json:"created_by"`                     // 创建人ID
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}
