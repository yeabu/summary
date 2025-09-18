package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
)

func BaseCreate(w http.ResponseWriter, r *http.Request) {
    var b models.Base
    if err := json.NewDecoder(r.Body).Decode(&b); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if b.Name == "" || b.Code == "" { http.Error(w, "name and code required", http.StatusBadRequest); return }
    if err := db.DB.Create(&b).Error; err != nil { http.Error(w, "create failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(b)
}

func BaseList(w http.ResponseWriter, r *http.Request) {
    var rows []models.Base
    db.DB.Order("name asc").Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}

func BaseGet(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var b models.Base
    if err := db.DB.First(&b, id).Error; err != nil { http.Error(w, "not found", http.StatusNotFound); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(b)
}

func BaseUpdate(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var body map[string]interface{}
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if err := db.DB.Model(&models.Base{}).Where("id = ?", id).Updates(body).Error; err != nil { http.Error(w, "update failed", http.StatusInternalServerError); return }
    var b models.Base
    _ = db.DB.First(&b, id).Error
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(b)
}

func BaseDelete(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    if err := db.DB.Delete(&models.Base{}, id).Error; err != nil { http.Error(w, "delete failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

func BaseBatchDelete(w http.ResponseWriter, r *http.Request) {
    var body struct{ IDs []uint `json:"ids"` }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if len(body.IDs) == 0 { http.Error(w, "ids required", http.StatusBadRequest); return }
    if err := db.DB.Where("id IN ?", body.IDs).Delete(&models.Base{}).Error; err != nil { http.Error(w, "delete failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]int{"deleted_count": len(body.IDs)})
}

