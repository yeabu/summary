package models

import (
	"time"

	"gorm.io/gorm"
)

// PayableRecord 应付款记录模型
type PayableRecord struct {
	ID uint `gorm:"primaryKey" json:"id"`
	// 兼容字段：历史上一条应付款对应一条采购
	// 现在支持一个应付款聚合多条采购，因此该字段改为可选
	PurchaseEntryID *uint          `json:"purchase_entry_id,omitempty"`
	PurchaseEntry   *PurchaseEntry `gorm:"foreignKey:PurchaseEntryID" json:"purchase_entry,omitempty"`
	SupplierID      *uint          `gorm:"foreignKey:SupplierID" json:"supplier_id,omitempty"`                    // 供应商ID
	Supplier        *Supplier      `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`                       // 关联的供应商
	BaseID          uint           `gorm:"not null" json:"base_id"`                                               // 基地ID
	Base            Base           `gorm:"foreignKey:BaseID" json:"base"`                                         // 关联的基地
	TotalAmount     float64        `gorm:"type:decimal(15,2);not null" json:"total_amount"`                       // 应付总金额
	PaidAmount      float64        `gorm:"type:decimal(15,2);default:0" json:"paid_amount"`                       // 已付金额
	Currency        string         `gorm:"size:8;default:CNY" json:"currency"`                                    // 币种
	RemainingAmount float64        `gorm:"type:decimal(15,2);not null" json:"remaining_amount"`                   // 剩余欠款
	Status          string         `gorm:"type:enum('pending','partial','paid');default:'pending'" json:"status"` // 状态
	DueDate         *time.Time     `json:"due_date"`                                                              // 到期日期
	// 结算周期：支持按月聚合（YYYY-MM），或灵活结算（为空）
	PeriodMonth string `gorm:"size:7" json:"period_month,omitempty"`
	// 半年周期：YYYY-H1 或 YYYY-H2，用于灵活结算按半年累计
	PeriodHalf     string          `gorm:"size:8" json:"period_half,omitempty"`
	CreatedBy      uint            `gorm:"not null" json:"created_by"`          // 创建人ID
	Creator        User            `gorm:"foreignKey:CreatedBy" json:"creator"` // 创建人
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	PaymentRecords []PaymentRecord `gorm:"foreignKey:PayableRecordID" json:"payment_records"` // 还款记录
	// 关联的采购链接（聚合模式）
	Links []PayableLink `gorm:"foreignKey:PayableRecordID" json:"links,omitempty"`
}

func (pr *PayableRecord) BeforeCreate(tx *gorm.DB) error {
	return assignSnowflakeID(&pr.ID)
}

// PaymentRecord 还款记录模型
type PaymentRecord struct {
	ID              uint          `gorm:"primaryKey" json:"id"`
	PayableRecordID uint          `gorm:"not null" json:"payable_record_id"`                                                               // 关联应付款记录ID
	PayableRecord   PayableRecord `gorm:"foreignKey:PayableRecordID" json:"-"`                                                             // 关联的应付款记录
	PaymentAmount   float64       `gorm:"type:decimal(15,2);not null" json:"payment_amount"`                                               // 还款金额
	Currency        string        `gorm:"size:8;default:CNY" json:"currency"`                                                              // 币种
	PaymentDate     time.Time     `gorm:"type:date;not null" json:"payment_date"`                                                          // 还款日期
	PaymentMethod   string        `gorm:"type:enum('cash','bank_transfer','check','other');default:'bank_transfer'" json:"payment_method"` // 还款方式
	ReferenceNumber string        `gorm:"size:100" json:"reference_number"`                                                                // 参考号
	Notes           string        `gorm:"type:text" json:"notes"`                                                                          // 还款备注
	CreatedBy       uint          `gorm:"not null" json:"created_by"`                                                                      // 操作人ID
	Creator         User          `gorm:"foreignKey:CreatedBy" json:"creator"`                                                             // 操作人
	CreatedAt       time.Time     `json:"created_at"`
}

func (pmr *PaymentRecord) BeforeCreate(tx *gorm.DB) error {
	return assignSnowflakeID(&pmr.ID)
}

// Supplier 供应商模型
type Supplier struct {
	ID            uint   `gorm:"primaryKey" json:"id"`
	Name          string `gorm:"unique;not null" json:"name"` // 供应商名称
	ContactPerson string `json:"contact_person"`              // 联系人
	Phone         string `json:"phone"`                       // 电话
	Email         string `json:"email"`                       // 邮箱
	Address       string `json:"address"`                     // 地址
	// 结算配置：immediate(即付)、monthly(月结)、flexible(不定期)
	SettlementType string `gorm:"size:20;default:'flexible'" json:"settlement_type"`
	// 月结日（1-31，可空），仅当 SettlementType=monthly 时有意义
	SettlementDay *int      `json:"settlement_day"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (s *Supplier) BeforeCreate(tx *gorm.DB) error {
	return assignSnowflakeID(&s.ID)
}

// PayableStatus 应付款状态常量
const (
	PayableStatusPending = "pending" // 待付款
	PayableStatusPartial = "partial" // 部分付款
	PayableStatusPaid    = "paid"    // 已付清
)

// PaymentMethod 还款方式常量
const (
	PaymentMethodCash         = "cash"          // 现金
	PaymentMethodBankTransfer = "bank_transfer" // 银行转账
	PaymentMethodCheck        = "check"         // 支票
	PaymentMethodOther        = "other"         // 其他
)

// UpdateAmounts 更新应付款金额和状态
func (pr *PayableRecord) UpdateAmounts() {
	pr.RemainingAmount = pr.TotalAmount - pr.PaidAmount

	if pr.RemainingAmount <= 0 {
		pr.Status = PayableStatusPaid
		pr.RemainingAmount = 0 // 确保不为负数
	} else if pr.PaidAmount > 0 {
		pr.Status = PayableStatusPartial
	} else {
		pr.Status = PayableStatusPending
	}
}

// IsOverdue 检查是否超期
func (pr *PayableRecord) IsOverdue() bool {
	if pr.DueDate == nil || pr.Status == PayableStatusPaid {
		return false
	}
	return time.Now().After(*pr.DueDate)
}

// GetStatusText 获取状态文本
func (pr *PayableRecord) GetStatusText() string {
	switch pr.Status {
	case PayableStatusPending:
		return "待付款"
	case PayableStatusPartial:
		return "部分付款"
	case PayableStatusPaid:
		return "已付清"
	default:
		return "未知状态"
	}
}

// GetPaymentMethodText 获取还款方式文本
func (pmr *PaymentRecord) GetPaymentMethodText() string {
	switch pmr.PaymentMethod {
	case PaymentMethodCash:
		return "现金"
	case PaymentMethodBankTransfer:
		return "银行转账"
	case PaymentMethodCheck:
		return "支票"
	case PaymentMethodOther:
		return "其他"
	default:
		return "未知方式"
	}
}
