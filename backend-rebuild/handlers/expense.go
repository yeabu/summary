package handlers

import (
    "encoding/json"
    "net/http"
    "time"
    "strconv"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
    "summary/backend-rebuild/middleware"
)

// Expense CRUD
func ExpenseCreate(w http.ResponseWriter, r *http.Request) {
    var body struct{
        Date string `json:"date"`
        CategoryID uint `json:"category_id"`
        Amount float64 `json:"amount"`
        Currency string `json:"currency"`
        Detail string `json:"detail"`
        BaseID uint `json:"base_id"`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    d, err := time.Parse("2006-01-02", body.Date); if err != nil { http.Error(w, "bad date", http.StatusBadRequest); return }
    cur := body.Currency
    if cur == "" { cur = "CNY" }
    exp := models.BaseExpense{ Date: d, CategoryID: body.CategoryID, Amount: body.Amount, Currency: cur, Detail: body.Detail, BaseID: body.BaseID, CreatedAt: time.Now(), UpdatedAt: time.Now() }
    if err := db.DB.Create(&exp).Error; err != nil { http.Error(w, "create failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(exp)
}

func ExpenseList(w http.ResponseWriter, r *http.Request) {
    claims, _ := middleware.ParseJWT(r)
    q := db.DB.Preload("Base").Preload("Category").Order("date desc")
    q = ScopeByRole(q, claims)
    if base := r.URL.Query().Get("base"); base != "" {
        var b models.Base; if err := db.DB.Where("name = ?", base).First(&b).Error; err == nil { q = q.Where("base_id = ?", b.ID) }
    }
    if cid := r.URL.Query().Get("category_id"); cid != "" { q = q.Where("category_id = ?", cid) }
    if sd := r.URL.Query().Get("start_date"); sd != "" { q = q.Where("date >= ?", sd) }
    if ed := r.URL.Query().Get("end_date"); ed != "" { q = q.Where("date < ?", ed+" 23:59:59") }
    var rows []models.BaseExpense
    q.Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}

func ExpenseUpdate(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var body map[string]interface{}
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if d, ok := body["date"].(string); ok && d != "" { if t, err := time.Parse("2006-01-02", d); err == nil { body["date"] = t } }
    if err := db.DB.Model(&models.BaseExpense{}).Where("id = ?", id).Updates(body).Error; err != nil { http.Error(w, "update failed", http.StatusInternalServerError); return }
    var exp models.BaseExpense; _ = db.DB.First(&exp, id).Error
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(exp)
}

func ExpenseDelete(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    if err := db.DB.Delete(&models.BaseExpense{}, id).Error; err != nil { http.Error(w, "delete failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

func ExpenseBatchDelete(w http.ResponseWriter, r *http.Request) {
    var body struct{ IDs []uint `json:"ids"` }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if len(body.IDs) == 0 { http.Error(w, "ids required", http.StatusBadRequest); return }
    if err := db.DB.Where("id IN ?", body.IDs).Delete(&models.BaseExpense{}).Error; err != nil { http.Error(w, "delete failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]int{"deleted_count": len(body.IDs)})
}

// Expense categories
func ExpenseCategoryCreate(w http.ResponseWriter, r *http.Request) {
    var c models.ExpenseCategory
    if err := json.NewDecoder(r.Body).Decode(&c); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if c.Name == "" { http.Error(w, "name required", http.StatusBadRequest); return }
    if err := db.DB.Create(&c).Error; err != nil { http.Error(w, "create failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(c)
}

func ExpenseCategoryList(w http.ResponseWriter, r *http.Request) {
    q := db.DB.Model(&models.ExpenseCategory{})
    if s := r.URL.Query().Get("status"); s != "" { q = q.Where("status = ?", s) }
    var rows []models.ExpenseCategory
    q.Order("name asc").Find(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}

func ExpenseCategoryGet(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var c models.ExpenseCategory
    if err := db.DB.First(&c, id).Error; err != nil { http.Error(w, "not found", http.StatusNotFound); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(c)
}

func ExpenseCategoryUpdate(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    var body map[string]interface{}
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if err := db.DB.Model(&models.ExpenseCategory{}).Where("id = ?", id).Updates(body).Error; err != nil { http.Error(w, "update failed", http.StatusInternalServerError); return }
    var c models.ExpenseCategory; _ = db.DB.First(&c, id).Error
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(c)
}

func ExpenseCategoryDelete(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64); if id == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    if err := db.DB.Delete(&models.ExpenseCategory{}, id).Error; err != nil { http.Error(w, "delete failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

// Expense stats: by month and base/category name
func ExpenseStats(w http.ResponseWriter, r *http.Request) {
    claims, _ := middleware.ParseJWT(r)
    month := r.URL.Query().Get("month")
    start := r.URL.Query().Get("start_date")
    end := r.URL.Query().Get("end_date")
    type Row struct { Base string; Category string; Month string; Total float64 }
    var out []Row

    q := db.DB.Table("base_expenses be").
        Select("b.name as base, ec.name as category, DATE_FORMAT(be.date, '%Y-%m') as month, COALESCE(SUM(be.amount),0) as total").
        Joins("LEFT JOIN bases b ON be.base_id = b.id").
        Joins("LEFT JOIN expense_categories ec ON be.category_id = ec.id")

    if len(month) == 7 {
        if t, err := time.Parse("2006-01", month); err == nil {
            s := t.Format("2006-01-02")
            e := t.AddDate(0,1,0).Format("2006-01-02")
            q = q.Where("be.date >= ? AND be.date < ?", s, e)
        }
    } else {
        if start != "" { q = q.Where("be.date >= ?", start) }
        if end != "" { q = q.Where("be.date < ?", end+" 23:59:59") }
    }

    if base := r.URL.Query().Get("base"); base != "" {
        var b models.Base; if err := db.DB.Where("name = ?", base).First(&b).Error; err == nil { q = q.Where("be.base_id = ?", b.ID) }
    }
    // base scoping
    if role, _ := claims["role"].(string); role == "base_agent" {
        ids := baseIDsFromClaims(claims); if len(ids) > 0 { q = q.Where("be.base_id IN ?", ids) }
    }
    q = q.Group("b.name, ec.name, DATE_FORMAT(be.date, '%Y-%m')").Order("total DESC")
    q.Scan(&out)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(out)
}
