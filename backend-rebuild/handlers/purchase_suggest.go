package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "summary/backend-rebuild/db"
)

// PurchaseSuggestPrice returns a suggested unit price for supplier+product
// Accepts: supplier_id (required), product_id or product_name
func PurchaseSuggestPrice(w http.ResponseWriter, r *http.Request) {
    sid, _ := strconv.ParseUint(r.URL.Query().Get("supplier_id"), 10, 64)
    if sid == 0 { http.Error(w, "supplier_id required", http.StatusBadRequest); return }
    pid, _ := strconv.ParseUint(r.URL.Query().Get("product_id"), 10, 64)
    name := r.URL.Query().Get("product_name")
    var price float64
    var ok bool
    if pid != 0 {
        // prefer price history
        row := db.DB.Table("supplier_product_prices").Where("supplier_id = ? AND product_id = ?", uint(sid), uint(pid)).Order("effective_from DESC").Limit(1)
        if err := row.Select("price").Scan(&price).Error; err == nil && price > 0 { ok = true }
        if !ok {
            if err := db.DB.Table("supplier_products").Where("supplier_id = ? AND product_id = ?", uint(sid), uint(pid)).Select("default_unit_price").Scan(&price).Error; err == nil && price > 0 { ok = true }
        }
    }
    if !ok && name != "" {
        row := db.DB.Table("purchase_entry_items pei").
            Joins("JOIN purchase_entries pe ON pe.id = pei.purchase_entry_id").
            Where("pe.supplier_id = ? AND pei.product_name = ?", uint(sid), name).
            Order("pe.purchase_date DESC").Limit(1)
        if err := row.Select("pei.unit_price").Scan(&price).Error; err == nil && price > 0 { ok = true }
    }
    resp := map[string]interface{}{"found": ok, "price": price}
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(resp)
}

