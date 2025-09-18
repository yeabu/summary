package models

import "time"

// ProductUnitSpec 商品单位规格、换算关系：1[unit] = factor_to_base [base unit]
type ProductUnitSpec struct {
    ID           uint      `gorm:"primaryKey" json:"id"`
    ProductID    uint      `gorm:"index;not null" json:"product_id"`
    Unit         string    `gorm:"size:32;not null" json:"unit"`
    FactorToBase float64   `gorm:"not null" json:"factor_to_base"`
    Kind         string    `gorm:"size:16;default:'both'" json:"kind"` // purchase|usage|both
    IsDefault    bool      `gorm:"default:false" json:"is_default"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

