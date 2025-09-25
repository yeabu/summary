package handlers

import (
    "encoding/json"
    "net/http"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
)

// ExchangeRateList returns all configured exchange rates
func ExchangeRateList(w http.ResponseWriter, r *http.Request) {
    var rows []models.ExchangeRate
    db.DB.Order("currency asc").Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}

