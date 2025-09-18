package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
)

// List unit specs of a product
func ListProductUnitSpecs(w http.ResponseWriter, r *http.Request) {
    pid, _ := strconv.ParseUint(r.URL.Query().Get("product_id"), 10, 64)
    if pid == 0 { http.Error(w, "product_id required", http.StatusBadRequest); return }
    var rows []models.ProductUnitSpec
    db.DB.Where("product_id = ?", uint(pid)).Order("unit asc").Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}

// Create or update a unit spec
func UpsertProductUnitSpec(w http.ResponseWriter, r *http.Request) {
    var body models.ProductUnitSpec
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if body.ProductID == 0 || body.Unit == "" || body.FactorToBase <= 0 { http.Error(w, "invalid payload", http.StatusBadRequest); return }
    // unique on (product_id, unit)
    var cur models.ProductUnitSpec
    if err := db.DB.Where("product_id = ? AND unit = ?", body.ProductID, body.Unit).First(&cur).Error; err == nil {
        cur.FactorToBase = body.FactorToBase
        if body.Kind != "" { cur.Kind = body.Kind }
        cur.IsDefault = body.IsDefault
        if err := db.DB.Save(&cur).Error; err != nil { http.Error(w, "update failed", http.StatusInternalServerError); return }
        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(cur)
        return
    }
    if err := db.DB.Create(&body).Error; err != nil { http.Error(w, "create failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(body)
}

func DeleteProductUnitSpec(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    if err := db.DB.Delete(&models.ProductUnitSpec{}, uint(id)).Error; err != nil { http.Error(w, "delete failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

