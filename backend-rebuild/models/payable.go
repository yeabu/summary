package models

import "time"

type PayableRecord struct {
    ID               uint           `gorm:"primaryKey" json:"id"`
    PurchaseEntryID  *uint          `json:"purchase_entry_id,omitempty"`
    PurchaseEntry    *PurchaseEntry `gorm:"foreignKey:PurchaseEntryID" json:"purchase_entry,omitempty"`
    SupplierID       *uint          `gorm:"index:idx_payable_supplier_base_status,priority:1" json:"supplier_id,omitempty"`
    Supplier         *Supplier      `gorm:"foreignKey:SupplierID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"supplier,omitempty"`
    BaseID           uint           `gorm:"index:idx_payable_supplier_base_status,priority:2;not null" json:"base_id"`
    Base             Base           `gorm:"foreignKey:BaseID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"base"`
    TotalAmount      float64        `gorm:"type:decimal(15,2);not null" json:"total_amount"`
    PaidAmount       float64        `gorm:"type:decimal(15,2);default:0" json:"paid_amount"`
    RemainingAmount  float64        `gorm:"type:decimal(15,2);not null" json:"remaining_amount"`
    Currency         string         `gorm:"size:8;default:'CNY'" json:"currency"`
    Status           string         `gorm:"type:enum('pending','partial','paid');default:'pending';index:idx_payable_supplier_base_status,priority:3" json:"status"`
    DueDate          *time.Time     `gorm:"index" json:"due_date"`
    PeriodMonth      string         `gorm:"size:7" json:"period_month,omitempty"`
    PeriodHalf       string         `gorm:"size:8" json:"period_half,omitempty"`
    SettlementType   string         `gorm:"size:20;default:'flexible'" json:"settlement_type"`
    CreatedBy        uint           `gorm:"not null" json:"created_by"`
    CreatorName      string         `json:"creator_name"`
    CreatedAt        time.Time      `json:"created_at"`
    UpdatedAt        time.Time      `json:"updated_at"`
    PaymentRecords   []PaymentRecord `gorm:"foreignKey:PayableRecordID;constraint:OnDelete:CASCADE" json:"payment_records"`
    Links            []PayableLink   `gorm:"foreignKey:PayableRecordID;constraint:OnDelete:CASCADE" json:"links,omitempty"`
}

type PaymentRecord struct {
    ID              uint          `gorm:"primaryKey" json:"id"`
    PayableRecordID uint          `gorm:"index;not null" json:"payable_record_id"`
    PayableRecord   PayableRecord `gorm:"foreignKey:PayableRecordID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
    PaymentAmount   float64       `gorm:"type:decimal(15,2);not null" json:"payment_amount"`
    Currency        string        `gorm:"size:8;default:'CNY'" json:"currency"`
    PaymentDate     time.Time     `gorm:"type:date;not null" json:"payment_date"`
    PaymentMethod   string        `gorm:"size:32;default:'bank_transfer';index" json:"payment_method"`
    ReferenceNumber string        `gorm:"size:100" json:"reference_number"`
    Notes           string        `gorm:"type:text" json:"notes"`
    CreatedBy       uint          `gorm:"not null" json:"created_by"`
    CreatedAt       time.Time     `gorm:"index" json:"created_at"`
}

func (pr *PayableRecord) UpdateAmounts() {
    pr.RemainingAmount = pr.TotalAmount - pr.PaidAmount
    if pr.RemainingAmount <= 0 {
        pr.Status = "paid"
        pr.RemainingAmount = 0
    } else if pr.PaidAmount > 0 {
        pr.Status = "partial"
    } else {
        pr.Status = "pending"
    }
}
