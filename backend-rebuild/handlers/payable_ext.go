package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "time"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
    "summary/backend-rebuild/middleware"
)

type PayableListResponse struct {
    Records []models.PayableRecord `json:"records"`
    Total   int64                  `json:"total"`
}

func PayableList(w http.ResponseWriter, r *http.Request) {
    claims, _ := middleware.ParseJWT(r)
    q := db.DB.Preload("Supplier").Preload("Base").Preload("Links").Preload("Links.PurchaseEntry").Order("created_at desc")
    q = ScopeByRole(q, claims)

    if supplier := r.URL.Query().Get("supplier"); supplier != "" {
        q = q.Joins("LEFT JOIN suppliers ON payable_records.supplier_id = suppliers.id").
            Where("suppliers.name LIKE ?", "%"+supplier+"%")
    }
    if status := r.URL.Query().Get("status"); status != "" {
        q = q.Where("payable_records.status = ?", status)
    }
    if baseName := r.URL.Query().Get("base"); baseName != "" {
        var base models.Base
        if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
            q = q.Where("payable_records.base_id = ?", base.ID)
        }
    }
    if sd := r.URL.Query().Get("start_date"); sd != "" {
        q = q.Where("payable_records.created_at >= ?", sd)
    }
    if ed := r.URL.Query().Get("end_date"); ed != "" {
        q = q.Where("payable_records.created_at < ?", ed+" 23:59:59")
    }

    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    if page < 1 { page = 1 }
    limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
    if limit <= 0 || limit > 100 { limit = 20 }
    offset := (page - 1) * limit

    var total int64
    q.Model(&models.PayableRecord{}).Count(&total)
    var rows []models.PayableRecord
    q.Limit(limit).Offset(offset).Find(&rows)

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(PayableListResponse{Records: rows, Total: total})
}

func PayableDetail(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    claims, _ := middleware.ParseJWT(r)
    var pr models.PayableRecord
    q := db.DB.Preload("Supplier").Preload("Base").Preload("Links").Preload("Links.PurchaseEntry").
        Preload("PurchaseEntry").Preload("PurchaseEntry.Items").Preload("PaymentRecords")
    q = ScopeByRole(q, claims)
    if err := q.First(&pr, id).Error; err != nil { http.Error(w, "not found", http.StatusNotFound); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(pr)
}

func UpdatePayableStatus(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var body struct { Status string `json:"status"` }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    var pr models.PayableRecord
    if err := db.DB.First(&pr, id).Error; err != nil { http.Error(w, "not found", http.StatusNotFound); return }

    updates := map[string]interface{}{ "status": body.Status, "updated_at": time.Now() }
    if body.Status == "paid" { updates["paid_amount"] = pr.TotalAmount; updates["remaining_amount"] = 0.0 }
    if body.Status == "pending" { updates["paid_amount"] = 0.0; updates["remaining_amount"] = pr.TotalAmount }
    if err := db.DB.Model(&pr).Updates(updates).Error; err != nil { http.Error(w, "update failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

type CreatePaymentRequest struct {
    PayableID   uint    `json:"payable_id"`
    Amount      float64 `json:"amount"`
    PaymentDate string  `json:"payment_date"`
    PaymentMethod string `json:"payment_method"`
    Reference   string  `json:"reference"`
    Note        string  `json:"note"`
}

func PaymentCreate(w http.ResponseWriter, r *http.Request) {
    if key := r.Header.Get("Idempotency-Key"); key != "" {
        var idem models.IdempotencyKey
        if err := db.DB.Where("`key` = ? AND resource = ?", key, "payment").First(&idem).Error; err == nil && idem.RefID != 0 {
            var existed models.PaymentRecord
            if err := db.DB.First(&existed, idem.RefID).Error; err == nil {
                w.Header().Set("Content-Type", "application/json")
                _ = json.NewEncoder(w).Encode(existed)
                return
            }
        }
    }
    var req CreatePaymentRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if req.PayableID == 0 || req.Amount <= 0 { http.Error(w, "invalid payload", http.StatusBadRequest); return }
    t, err := time.Parse("2006-01-02", req.PaymentDate); if err != nil { http.Error(w, "bad date", http.StatusBadRequest); return }

    tx := db.DB.Begin()
    if tx.Error != nil { http.Error(w, "tx error", http.StatusInternalServerError); return }

    // Fetch payable to inherit currency for payment record
    var parent models.PayableRecord
    _ = tx.First(&parent, req.PayableID).Error
    pay := models.PaymentRecord{
        PayableRecordID: req.PayableID,
        PaymentAmount: req.Amount,
        Currency: func() string { if parent.Currency != "" { return parent.Currency }; return "CNY" }(),
        PaymentDate: t,
        PaymentMethod: req.PaymentMethod,
        ReferenceNumber: req.Reference,
        Notes: req.Note,
        CreatedBy: 0,
        CreatedAt: time.Now(),
    }
    if err := tx.Create(&pay).Error; err != nil { tx.Rollback(); http.Error(w, "create failed", http.StatusInternalServerError); return }

    // Recalc payable
    var totalPaid float64
    tx.Model(&models.PaymentRecord{}).Where("payable_record_id = ?", req.PayableID).Select("COALESCE(SUM(payment_amount),0)").Scan(&totalPaid)
    var pr models.PayableRecord
    if err := tx.First(&pr, req.PayableID).Error; err != nil { tx.Rollback(); http.Error(w, "payable missing", http.StatusNotFound); return }
    pr.PaidAmount = totalPaid
    pr.RemainingAmount = pr.TotalAmount - totalPaid
    pr.UpdateAmounts()
    if err := tx.Save(&pr).Error; err != nil { tx.Rollback(); http.Error(w, "update payable failed", http.StatusInternalServerError); return }

    if err := tx.Commit().Error; err != nil { http.Error(w, "commit failed", http.StatusInternalServerError); return }
    if key := r.Header.Get("Idempotency-Key"); key != "" {
        _ = db.DB.Create(&models.IdempotencyKey{Key: key, Resource: "payment", RefID: pay.ID, CreatedAt: time.Now()}).Error
    }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(pay)
}

type PaymentListResponse struct {
    Records []models.PaymentRecord `json:"records"`
    Total   int64                  `json:"total"`
}

func PaymentList(w http.ResponseWriter, r *http.Request) {
    claims, _ := middleware.ParseJWT(r)
    q := db.DB.Model(&models.PaymentRecord{}).Order("payment_date desc")
    if pid := r.URL.Query().Get("payable_id"); pid != "" {
        q = q.Where("payable_record_id = ?", pid)
    }
    // Scope payments by payable's base for base_agent
    if role, _ := claims["role"].(string); role == "base_agent" {
        ids := baseIDsFromClaims(claims)
        if len(ids) > 0 {
            q = q.Joins("JOIN payable_records p ON p.id = payment_records.payable_record_id").Where("p.base_id IN ?", ids)
        }
    }
    if sd := r.URL.Query().Get("start_date"); sd != "" { q = q.Where("payment_date >= ?", sd) }
    if ed := r.URL.Query().Get("end_date"); ed != "" { q = q.Where("payment_date < ?", ed+" 23:59:59") }

    page, _ := strconv.Atoi(r.URL.Query().Get("page")); if page < 1 { page = 1 }
    limit, _ := strconv.Atoi(r.URL.Query().Get("limit")); if limit <= 0 || limit > 100 { limit = 20 }
    offset := (page-1)*limit
    var total int64
    q.Count(&total)
    var rows []models.PaymentRecord
    q.Limit(limit).Offset(offset).Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(PaymentListResponse{Records: rows, Total: total})
}

func PaymentDelete(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var payment models.PaymentRecord
    if err := db.DB.First(&payment, id).Error; err != nil { http.Error(w, "not found", http.StatusNotFound); return }

    tx := db.DB.Begin()
    if tx.Error != nil { http.Error(w, "tx error", http.StatusInternalServerError); return }
    if err := tx.Delete(&payment).Error; err != nil { tx.Rollback(); http.Error(w, "delete failed", http.StatusInternalServerError); return }
    var totalPaid float64
    tx.Model(&models.PaymentRecord{}).Where("payable_record_id = ?", payment.PayableRecordID).Select("COALESCE(SUM(payment_amount),0)").Scan(&totalPaid)
    var pr models.PayableRecord
    if err := tx.First(&pr, payment.PayableRecordID).Error; err != nil { tx.Rollback(); http.Error(w, "payable missing", http.StatusNotFound); return }
    pr.PaidAmount = totalPaid
    pr.RemainingAmount = pr.TotalAmount - totalPaid
    pr.UpdateAmounts()
    if err := tx.Save(&pr).Error; err != nil { tx.Rollback(); http.Error(w, "update payable failed", http.StatusInternalServerError); return }
    if err := tx.Commit().Error; err != nil { http.Error(w, "commit failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}
