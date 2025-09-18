package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
)

type SupplierListResponse struct {
    Records []models.Supplier `json:"records"`
    Total   int64             `json:"total"`
}

func SupplierList(w http.ResponseWriter, r *http.Request) {
    q := db.DB.Model(&models.Supplier{}).Order("updated_at desc")
    if name := r.URL.Query().Get("name"); name != "" {
        q = q.Where("name LIKE ?", "%"+name+"%")
    }
    page, _ := strconv.Atoi(r.URL.Query().Get("page")); if page < 1 { page = 1 }
    limit, _ := strconv.Atoi(r.URL.Query().Get("limit")); if limit <= 0 || limit > 100 { limit = 20 }
    offset := (page-1)*limit
    var total int64
    q.Count(&total)
    var rows []models.Supplier
    q.Limit(limit).Offset(offset).Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(SupplierListResponse{Records: rows, Total: total})
}

func SupplierAll(w http.ResponseWriter, r *http.Request) {
    var rows []models.Supplier
    db.DB.Order("name asc").Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}

func SupplierDetail(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var s models.Supplier
    if err := db.DB.First(&s, id).Error; err != nil { http.Error(w, "not found", http.StatusNotFound); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(s)
}

func SupplierCreate(w http.ResponseWriter, r *http.Request) {
    var s models.Supplier
    if err := json.NewDecoder(r.Body).Decode(&s); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if s.Name == "" { http.Error(w, "name required", http.StatusBadRequest); return }
    if err := db.DB.Create(&s).Error; err != nil { http.Error(w, "create failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(s)
}

func SupplierUpdate(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var body map[string]interface{}
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if err := db.DB.Model(&models.Supplier{}).Where("id = ?", id).Updates(body).Error; err != nil { http.Error(w, "update failed", http.StatusInternalServerError); return }
    var s models.Supplier
    _ = db.DB.First(&s, id).Error
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(s)
}

func SupplierDelete(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    if err := db.DB.Delete(&models.Supplier{}, id).Error; err != nil { http.Error(w, "delete failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

