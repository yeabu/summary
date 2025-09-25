package handlers

import (
    "backend/db"
    "backend/middleware"
    "backend/models"
    "encoding/json"
    "net/http"
    "time"
)

type ExpenseByBase struct {
    Base  string  `json:"base"`
    Total float64 `json:"total"`
}

type PurchaseBySupplier struct {
    Supplier string  `json:"supplier"`
    Total    float64 `json:"total"`
    Count    int64   `json:"count"`
}

type PurchaseByBase struct {
    Base  string  `json:"base"`
    Total float64 `json:"total"`
}

type TimeRangeSummaryResponse struct {
    StartDate string               `json:"start_date"`
    EndDate   string               `json:"end_date"`
    // 开支（BaseExpense）
    TotalExpense   float64         `json:"total_expense"`
    ExpenseByBase  []ExpenseByBase `json:"expense_by_base"`
    // 采购（PurchaseEntry）
    TotalPurchase         float64              `json:"total_purchase"`
    PurchaseBySupplier    []PurchaseBySupplier `json:"purchase_by_supplier"`
    PurchaseByBase        []PurchaseByBase     `json:"purchase_by_base"`
}

// getRatesMap 返回 currency->rate_to_cny 的映射，默认 CNY=1
func getRatesMap() map[string]float64 {
    rates := map[string]float64{"CNY": 1}
    var rows []models.ExchangeRate
    db.DB.Find(&rows)
    for _, r := range rows {
        c := r.Currency
        if c == "" { continue }
        rates[c] = r.RateToCNY
    }
    return rates
}

// AnalyticsSummary 返回指定时间范围内的汇总分析
func AnalyticsSummary(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil {
        http.Error(w, "token无效", http.StatusUnauthorized)
        return
    }
    roleIfc := claims["role"]
    role, _ := roleIfc.(string)

    start := r.URL.Query().Get("start_date")
    end := r.URL.Query().Get("end_date")
    if start == "" || end == "" {
        http.Error(w, "start_date 和 end_date 必填，格式 YYYY-MM-DD", http.StatusBadRequest)
        return
    }
    // 解析与标准化
    startTime, errS := time.Parse("2006-01-02", start)
    endTime, errE := time.Parse("2006-01-02", end)
    if errS != nil || errE != nil {
        http.Error(w, "日期格式应为 YYYY-MM-DD", http.StatusBadRequest)
        return
    }
    // 包含结束日期整天：将结束时间加1天，并在查询中使用 < endTimeNext
    endTime = endTime.AddDate(0, 0, 1)

    // 可选：基地限制（base_agent/captain）
    var baseIDs []uint
    if role == "base_agent" || role == "captain" {
        var codes []string
        if v, ok := claims["bases"]; ok && v != nil {
            if arr, ok2 := v.([]interface{}); ok2 {
                for _, x := range arr { if s, ok3 := x.(string); ok3 { codes = append(codes, s) } }
            }
        }
        if len(codes) > 0 {
            var bs []models.Base
            if err := db.DB.Where("code IN ?", codes).Find(&bs).Error; err == nil {
                for _, b := range bs { baseIDs = append(baseIDs, b.ID) }
            }
        }
    }

    resp := TimeRangeSummaryResponse{StartDate: start, EndDate: end}
    rates := getRatesMap()

    // 1) 开支总额：先按币种汇总，再按汇率折算为CNY
    var expByCurr []struct{ Curr string; Total float64 }
    expByCurrQ := db.DB.Table("base_expenses be").
        Select("COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(be.amount),0) as total").
        Joins("LEFT JOIN bases b ON b.id = be.base_id").
        Where("be.date >= ? AND be.date < ?", startTime, endTime)
    if len(baseIDs) > 0 { expByCurrQ = expByCurrQ.Where("be.base_id IN ?", baseIDs) }
    expByCurrQ.Group("curr").Scan(&expByCurr)
    for _, r := range expByCurr { rate := rates[r.Curr]; if rate == 0 { rate = 1 }; resp.TotalExpense += r.Total * rate }

    // 1.1) 各基地开支（折算为CNY）
    var expByBase []struct{ Name string; Curr string; Total float64 }
    expByBaseQ := db.DB.Table("base_expenses be").
        Select("b.name as name, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(be.amount),0) as total").
        Joins("LEFT JOIN bases b ON be.base_id = b.id").
        Where("be.date >= ? AND be.date < ?", startTime, endTime)
    if len(baseIDs) > 0 { expByBaseQ = expByBaseQ.Where("be.base_id IN ?", baseIDs) }
    expByBaseQ.Group("b.id").Order("total DESC").Scan(&expByBase)
    for _, x := range expByBase { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; resp.ExpenseByBase = append(resp.ExpenseByBase, ExpenseByBase{Base: x.Name, Total: x.Total * rate}) }

    // 2) 采购总额：先按币种汇总，再折算为CNY
    var purByCurr []struct{ Curr string; Total float64 }
    purByCurrQ := db.DB.Table("purchase_entries pe").
        Select("COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(pe.total_amount),0) as total").
        Joins("LEFT JOIN bases b ON b.id = pe.base_id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", startTime, endTime)
    if len(baseIDs) > 0 { purByCurrQ = purByCurrQ.Where("pe.base_id IN ?", baseIDs) }
    purByCurrQ.Group("curr").Scan(&purByCurr)
    for _, r := range purByCurr { rate := rates[r.Curr]; if rate == 0 { rate = 1 }; resp.TotalPurchase += r.Total * rate }

    // 2.1) 各供应商采购总额（折算为CNY）
    var purBySupp []struct{ Supplier string; Curr string; Total float64; Cnt int64 }
    purBySuppQ := db.DB.Table("purchase_entries pe").
        Select("s.name as supplier, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(pe.total_amount),0) as total, COUNT(pe.id) as cnt").
        Joins("LEFT JOIN suppliers s ON pe.supplier_id = s.id").
        Joins("LEFT JOIN bases b ON b.id = pe.base_id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", startTime, endTime)
    if len(baseIDs) > 0 { purBySuppQ = purBySuppQ.Where("pe.base_id IN ?", baseIDs) }
    purBySuppQ.Group("s.id, curr").Order("total DESC").Scan(&purBySupp)
    aggSupp := map[string]PurchaseBySupplier{}
    for _, x := range purBySupp { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; ps := aggSupp[x.Supplier]; ps.Supplier = x.Supplier; ps.Total += x.Total * rate; ps.Count += x.Cnt; aggSupp[x.Supplier] = ps }
    for _, v := range aggSupp { resp.PurchaseBySupplier = append(resp.PurchaseBySupplier, v) }

    // 2.2) 各基地采购总额（折算为CNY）
    var purByBase []struct{ Base string; Curr string; Total float64 }
    purByBaseQ := db.DB.Table("purchase_entries pe").
        Select("b.name as base, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(pe.total_amount),0) as total").
        Joins("LEFT JOIN bases b ON pe.base_id = b.id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", startTime, endTime)
    if len(baseIDs) > 0 { purByBaseQ = purByBaseQ.Where("pe.base_id IN ?", baseIDs) }
    purByBaseQ.Group("b.id").Order("total DESC").Scan(&purByBase)
    for _, x := range purByBase { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; resp.PurchaseByBase = append(resp.PurchaseByBase, PurchaseByBase{Base: x.Base, Total: x.Total * rate}) }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

// ExpenseByBaseDetail 统计每个基地开支，支持按类别筛选
// GET params: start_date, end_date, category_id?, category_name?
func ExpenseByBaseDetail(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    role, _ := claims["role"].(string)
    start := r.URL.Query().Get("start_date"); end := r.URL.Query().Get("end_date")
    if start == "" || end == "" { http.Error(w, "start_date/end_date 必填", http.StatusBadRequest); return }
    st, es := time.Parse("2006-01-02", start); et, ee := time.Parse("2006-01-02", end)
    if es != nil || ee != nil { http.Error(w, "日期格式应为 YYYY-MM-DD", http.StatusBadRequest); return }
    et = et.AddDate(0,0,1)

    // 角色范围限定
    var baseIDs []uint
    if role == "base_agent" || role == "captain" {
        var codes []string
        if v, ok := claims["bases"]; ok && v != nil { if arr, ok2 := v.([]interface{}); ok2 { for _, x := range arr { if s, ok3 := x.(string); ok3 { codes = append(codes, s) } } } }
        if len(codes) > 0 {
            var bs []models.Base; _ = db.DB.Where("code IN ?", codes).Find(&bs).Error
            for _, b := range bs { baseIDs = append(baseIDs, b.ID) }
        }
    }

    q := db.DB.Table("base_expenses be").
        Select("b.name as base, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(be.amount),0) as total").
        Joins("LEFT JOIN bases b ON b.id = be.base_id").
        Where("be.date >= ? AND be.date < ?", st, et)
    if len(baseIDs) > 0 { q = q.Where("be.base_id IN ?", baseIDs) }

    // 类别筛选
    if cid := r.URL.Query().Get("category_id"); cid != "" {
        q = q.Where("be.category_id = ?", cid)
    } else if cname := r.URL.Query().Get("category_name"); cname != "" {
        var cat models.ExpenseCategory
        if err := db.DB.Where("name = ?", cname).First(&cat).Error; err == nil { q = q.Where("be.category_id = ?", cat.ID) } else { q = q.Where("1=0") }
    }
    type Row struct{ Base string `json:"base"`; Curr string; Total float64 `json:"total"` }
    var rowsRaw []Row
    q.Group("b.id").Order("total DESC").Scan(&rowsRaw)
    rates := getRatesMap()
    // 转CNY
    out := make([]struct{ Base string `json:"base"`; Total float64 `json:"total"` }, 0, len(rowsRaw))
    for _, r0 := range rowsRaw { rate := rates[r0.Curr]; if rate == 0 { rate = 1 }; out = append(out, struct{ Base string `json:"base"`; Total float64 `json:"total"` }{ Base: r0.Base, Total: r0.Total*rate }) }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(out)
}

// RequisitionByBase 统计每个基地物资申领，支持按商品筛选
// GET params: start_date, end_date, product_id?, product_name?
func RequisitionByBase(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    role, _ := claims["role"].(string)
    start := r.URL.Query().Get("start_date"); end := r.URL.Query().Get("end_date")
    if start == "" || end == "" { http.Error(w, "start_date/end_date 必填", http.StatusBadRequest); return }
    st, es := time.Parse("2006-01-02", start); et, ee := time.Parse("2006-01-02", end)
    if es != nil || ee != nil { http.Error(w, "日期格式应为 YYYY-MM-DD", http.StatusBadRequest); return }
    et = et.AddDate(0,0,1)

    var baseIDs []uint
    if role == "base_agent" || role == "captain" {
        var codes []string
        if v, ok := claims["bases"]; ok && v != nil { if arr, ok2 := v.([]interface{}); ok2 { for _, x := range arr { if s, ok3 := x.(string); ok3 { codes = append(codes, s) } } } }
        if len(codes) > 0 { var bs []models.Base; _ = db.DB.Where("code IN ?", codes).Find(&bs).Error; for _, b := range bs { baseIDs = append(baseIDs, b.ID) } }
    }

    // 统计按基地汇总的申领总额（也可改为数量）
    q := db.DB.Table("material_requisitions mr").
        Select("b.name as base, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(mr.total_amount),0) as total").
        Joins("LEFT JOIN bases b ON b.id = mr.base_id").
        Where("mr.request_date >= ? AND mr.request_date < ?", st, et)
    if len(baseIDs) > 0 { q = q.Where("mr.base_id IN ?", baseIDs) }

    if pid := r.URL.Query().Get("product_id"); pid != "" { q = q.Where("mr.product_id = ?", pid) }
    if pname := r.URL.Query().Get("product_name"); pname != "" { q = q.Where("mr.product_name = ?", pname) }

    type Row struct{ Base string `json:"base"`; Curr string; Total float64 `json:"total"` }
    var rowsRaw []Row
    q.Group("b.id").Order("total DESC").Scan(&rowsRaw)
    rates := getRatesMap()
    out := make([]struct{ Base string `json:"base"`; Total float64 `json:"total"` }, 0, len(rowsRaw))
    for _, r0 := range rowsRaw { rate := rates[r0.Curr]; if rate == 0 { rate = 1 }; out = append(out, struct{ Base string `json:"base"`; Total float64 `json:"total"` }{ Base: r0.Base, Total: r0.Total*rate }) }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(out)
}
