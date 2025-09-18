package handlers

import (
    "encoding/json"
    "net/http"
    "time"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
    "summary/backend-rebuild/middleware"
)

type PayableSummary struct {
    TotalPayable     float64 `json:"total_payable"`
    TotalPaid        float64 `json:"total_paid"`
    TotalRemaining   float64 `json:"total_remaining"`
    PendingCount     int64   `json:"pending_count"`
    PartialCount     int64   `json:"partial_count"`
    PaidCount        int64   `json:"paid_count"`
    OverdueCount     int64   `json:"overdue_count"`
}

// GetPayableSummary aggregates overall totals and counts
func GetPayableSummary(w http.ResponseWriter, r *http.Request) {
    claims, _ := middleware.ParseJWT(r)
    var sumTotal, sumPaid, sumRemaining float64
    q := db.DB.Model(&models.PayableRecord{})
    q = ScopeByRole(q, claims)
    q.Select("COALESCE(SUM(total_amount),0)").Scan(&sumTotal)
    q = db.DB.Model(&models.PayableRecord{})
    q = ScopeByRole(q, claims)
    q.Select("COALESCE(SUM(paid_amount),0)").Scan(&sumPaid)
    q = db.DB.Model(&models.PayableRecord{})
    q = ScopeByRole(q, claims)
    q.Select("COALESCE(SUM(remaining_amount),0)").Scan(&sumRemaining)

    var pending, partial, paid int64
    ScopeByRole(db.DB.Model(&models.PayableRecord{}), claims).Where("status = ?", "pending").Count(&pending)
    ScopeByRole(db.DB.Model(&models.PayableRecord{}), claims).Where("status = ?", "partial").Count(&partial)
    ScopeByRole(db.DB.Model(&models.PayableRecord{}), claims).Where("status = ?", "paid").Count(&paid)

    var overdue int64
    ScopeByRole(db.DB.Model(&models.PayableRecord{}), claims).Where("due_date IS NOT NULL AND due_date < ? AND status <> ?", time.Now(), "paid").Count(&overdue)

    resp := PayableSummary{
        TotalPayable: sumTotal,
        TotalPaid: sumPaid,
        TotalRemaining: sumRemaining,
        PendingCount: pending,
        PartialCount: partial,
        PaidCount: paid,
        OverdueCount: overdue,
    }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(resp)
}

type SupplierPayableRow struct {
    Supplier        string  `json:"supplier"`
    TotalAmount     float64 `json:"total_amount"`
    PaidAmount      float64 `json:"paid_amount"`
    RemainingAmount float64 `json:"remaining_amount"`
    RecordCount     int64   `json:"record_count"`
}

// GetPayableBySupplier aggregates payables by supplier; optional month filter (YYYY-MM)
func GetPayableBySupplier(w http.ResponseWriter, r *http.Request) {
    claims, _ := middleware.ParseJWT(r)
    month := r.URL.Query().Get("month")
    q := db.DB.Table("payable_records pr").
        Select("COALESCE(s.name, '-') as supplier, COALESCE(SUM(pr.total_amount),0) as total_amount, COALESCE(SUM(pr.paid_amount),0) as paid_amount, COALESCE(SUM(pr.remaining_amount),0) as remaining_amount, COUNT(pr.id) as record_count").
        Joins("LEFT JOIN suppliers s ON pr.supplier_id = s.id").
        Where("pr.status <> ?", "paid")

    if month != "" {
        q = q.Where("pr.period_month = ?", month)
    }
    // base scoping
    if role, _ := claims["role"].(string); role == "base_agent" {
        ids := baseIDsFromClaims(claims); if len(ids) > 0 { q = q.Where("pr.base_id IN ?", ids) }
    }
    q = q.Group("s.name").Order("remaining_amount DESC")

    var rows []SupplierPayableRow
    q.Scan(&rows)

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}

// GetOverduePayables lists overdue (status != paid and due_date < now)
func GetOverduePayables(w http.ResponseWriter, r *http.Request) {
    claims, _ := middleware.ParseJWT(r)
    var rows []models.PayableRecord
    q := db.DB.Preload("Supplier").Preload("Base").Where("due_date IS NOT NULL AND due_date < ? AND status <> ?", time.Now(), "paid")
    q = ScopeByRole(q, claims)
    q.Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}
