package models

import "time"

// ProductUnitSpec 定义某商品的单位规格与换算关系
// 如：单位=箱，factor_to_base=4，表示 1箱 = 4(基准单位)
type ProductUnitSpec struct {
    ID            uint      `gorm:"primaryKey" json:"id"`
    ProductID     uint      `gorm:"index;not null" json:"product_id"`
    Unit          string    `gorm:"size:32;not null" json:"unit"` // 箱、件、瓶、包、吨等
    FactorToBase  float64   `gorm:"not null" json:"factor_to_base"`
    Kind          string    `gorm:"size:16;default:'both'" json:"kind"` // purchase|usage|both
    IsDefault     bool      `gorm:"default:false" json:"is_default"`     // 是否默认（指定场景下）
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
}

