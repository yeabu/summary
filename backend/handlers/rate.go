package handlers

import (
    "backend/db"
    "backend/middleware"
    "backend/models"
    "encoding/json"
    "net/http"
    "strings"
)

// ListExchangeRates 获取所有汇率（含CNY=1）
func ListExchangeRates(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    var rows []models.ExchangeRate
    db.DB.Order("currency asc").Find(&rows)
    // 补上CNY
    foundCNY := false
    for _, it := range rows { if strings.ToUpper(it.Currency) == "CNY" { foundCNY = true; break } }
    if !foundCNY { rows = append([]models.ExchangeRate{{Currency: "CNY", RateToCNY: 1}}, rows...) }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(rows)
}

// UpsertExchangeRate 新增/更新汇率（仅管理员）
func UpsertExchangeRate(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "无权限", http.StatusForbidden); return }
    var body struct{ Currency string `json:"currency"`; RateToCNY float64 `json:"rate_to_cny"` }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "参数错误", http.StatusBadRequest); return }
    c := strings.ToUpper(strings.TrimSpace(body.Currency))
    if c == "" { http.Error(w, "currency 必填", http.StatusBadRequest); return }
    if c == "CNY" { http.Error(w, "无需设置CNY汇率", http.StatusBadRequest); return }
    var cur models.ExchangeRate
    if err := db.DB.Where("currency = ?", c).First(&cur).Error; err == nil {
        cur.RateToCNY = body.RateToCNY
        db.DB.Save(&cur)
        w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(cur); return
    }
    cur = models.ExchangeRate{Currency: c, RateToCNY: body.RateToCNY}
    db.DB.Create(&cur)
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(cur)
}

