package handlers

import (
    "encoding/json"
    "net/http"
    "time"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
    "summary/backend-rebuild/middleware"
)

// ListPurchase supports filters: base, supplier name, order_number, start_date, end_date (inclusive)
func ListPurchase(w http.ResponseWriter, r *http.Request) {
    claims, _ := middleware.ParseJWT(r)
    q := db.DB.Preload("Items").Preload("Base").Preload("Supplier").Order("purchase_date desc")
    q = ScopeByRole(q, claims)

    if base := r.URL.Query().Get("base"); base != "" {
        var baseModel models.Base
        if err := db.DB.Where("name = ?", base).First(&baseModel).Error; err == nil {
            q = q.Where("base_id = ?", baseModel.ID)
        }
    }
    if supplier := r.URL.Query().Get("supplier"); supplier != "" {
        q = q.Joins("LEFT JOIN suppliers ON purchase_entries.supplier_id = suppliers.id").
            Where("suppliers.name LIKE ?", "%"+supplier+"%")
    }
    if order := r.URL.Query().Get("order_number"); order != "" {
        q = q.Where("order_number LIKE ?", "%"+order+"%")
    }
    if start := r.URL.Query().Get("start_date"); start != "" {
        if t, err := time.Parse("2006-01-02", start); err == nil {
            q = q.Where("purchase_date >= ?", t)
        }
    }
    if end := r.URL.Query().Get("end_date"); end != "" {
        if t, err := time.Parse("2006-01-02", end); err == nil {
            t = t.AddDate(0,0,1)
            q = q.Where("purchase_date < ?", t)
        }
    }

    var rows []models.PurchaseEntry
    q.Find(&rows)

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}
