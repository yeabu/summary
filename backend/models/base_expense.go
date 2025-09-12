package models

import "time"

type BaseExpense struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
<<<<<<< HEAD
	BaseID      *uint           `gorm:"" json:"base_id,omitempty"`             // 所属基地ID (可选)
	Base        *Base           `gorm:"foreignKey:BaseID" json:"base,omitempty"` // 关联的基地 (可选)
=======
	BaseID      uint            `gorm:"not null" json:"base_id"`               // 所属基地ID
	Base        Base            `gorm:"foreignKey:BaseID" json:"base"`         // 关联的基地
>>>>>>> 40aea7b13475fe61df859812522ad8e7e258c893
	Date        time.Time       `json:"date"`                                  // 发生日期
	CategoryID  uint            `gorm:"not null" json:"category_id"`           // 费用类别ID
	Category    ExpenseCategory `gorm:"foreignKey:CategoryID" json:"category"` // 关联的费用类别
	Amount      float64         `json:"amount"`
	Detail      string          `json:"detail"`
	CreatedBy   uint            `json:"created_by"`
	CreatorName string          `json:"creator_name"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
<<<<<<< HEAD
}
=======
}
>>>>>>> 40aea7b13475fe61df859812522ad8e7e258c893
