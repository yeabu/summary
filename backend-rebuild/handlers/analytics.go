package handlers

import (
    "encoding/json"
    "net/http"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/middleware"
    "time"
)

type ExpenseByBaseRow struct { Base string `json:"base"`; Total float64 `json:"total"` }
type PurchaseBySupplierRow struct { Supplier string `json:"supplier"`; Total float64 `json:"total"`; Count int64 `json:"count"` }
type PurchaseByBaseRow struct { Base string `json:"base"`; Total float64 `json:"total"` }

type AnalyticsSummaryResponse struct {
    StartDate string `json:"start_date"`
    EndDate   string `json:"end_date"`
    TotalExpense float64 `json:"total_expense"`
    ExpenseByBase []ExpenseByBaseRow `json:"expense_by_base"`
    TotalPurchase float64 `json:"total_purchase"`
    PurchaseBySupplier []PurchaseBySupplierRow `json:"purchase_by_supplier"`
    PurchaseByBase []PurchaseByBaseRow `json:"purchase_by_base"`
}

// AnalyticsSummary computes time-range analytics for expense and purchase
func AnalyticsSummary(w http.ResponseWriter, r *http.Request) {
    start := r.URL.Query().Get("start_date")
    end := r.URL.Query().Get("end_date")
    if start == "" || end == "" { http.Error(w, "start_date and end_date required", http.StatusBadRequest); return }

    resp := AnalyticsSummaryResponse{ StartDate: start, EndDate: end }
    claims, _ := middleware.ParseJWT(r)
    ids := baseIDsFromClaims(claims)

    // Decide MV usage: explicit param wins; otherwise default to MV if the range covers whole months.
    // If prefer_mv=true and the range spans multiple months, trim to month bounds and use MV.
    useMVParam := r.URL.Query().Get("use_mv")
    preferMV := r.URL.Query().Get("prefer_mv") == "true"
    useMV := false
    if useMVParam == "true" {
        useMV = true
    } else if useMVParam == "false" {
        useMV = false
    } else {
        if coversWholeMonths(start, end) { useMV = true }
        // If caller prefers MV and range spans multiple months, switch to MV and trim to full months
        if !useMV && preferMV && spansMultipleMonths(start, end) {
            // trim to full month bounds
            ts, te, ok := monthBounds(start, end)
            if ok {
                start, end = ts, te
                resp.StartDate, resp.EndDate = start, end
                useMV = true
            }
        }
    }
    if useMV {
        // Aggregate by months using materialized tables
        months := enumerateMonths(start, end)
        if len(months) == 0 {
            w.Header().Set("Content-Type", "application/json")
            _ = json.NewEncoder(w).Encode(resp)
            return
        }
        // Expenses by base from mv_base_expense_month
        type eRow struct{ BaseID uint; Name string; Total float64 }
        var eRows []eRow
        qeb := db.DB.Table("mv_base_expense_month m").
            Select("m.base_id as base_id, b.name as name, COALESCE(SUM(m.total_amount),0) as total").
            Joins("JOIN bases b ON b.id = m.base_id").
            Where("m.month IN ?", months)
        if len(ids) > 0 { qeb = qeb.Where("m.base_id IN ?", ids) }
        qeb.Group("m.base_id, b.name").Scan(&eRows)
        var totalExp float64
        for _, x := range eRows { totalExp += x.Total; resp.ExpenseByBase = append(resp.ExpenseByBase, ExpenseByBaseRow{Base: x.Name, Total: x.Total}) }
        resp.TotalExpense = totalExp

        // Purchases from mv_supplier_monthly_spend
        type sRow struct{ SupplierID *uint; Name string; Total float64; Cnt uint64 }
        var sRows []sRow
        qps := db.DB.Table("mv_supplier_monthly_spend m").
            Select("COALESCE(s.id, NULL) as supplier_id, COALESCE(s.name, '-') as name, COALESCE(SUM(m.total_purchase),0) as total, COALESCE(SUM(m.purchase_count),0) as cnt").
            Joins("LEFT JOIN suppliers s ON s.id = m.supplier_id").
            Where("m.month IN ?", months)
        if len(ids) > 0 { qps = qps.Where("m.base_id IN ?", ids) }
        qps.Group("s.id, s.name").Order("total DESC").Scan(&sRows)
        var totalPur float64
        for _, x := range sRows { totalPur += x.Total; resp.PurchaseBySupplier = append(resp.PurchaseBySupplier, PurchaseBySupplierRow{Supplier: x.Name, Total: x.Total, Count: int64(x.Cnt)}) }
        resp.TotalPurchase = totalPur

        // Purchases by base
        type bRow struct{ BaseID uint; Name string; Total float64 }
        var bRows []bRow
        qpb := db.DB.Table("mv_supplier_monthly_spend m").
            Select("m.base_id as base_id, b.name as name, COALESCE(SUM(m.total_purchase),0) as total").
            Joins("JOIN bases b ON b.id = m.base_id").
            Where("m.month IN ?", months)
        if len(ids) > 0 { qpb = qpb.Where("m.base_id IN ?", ids) }
        qpb.Group("m.base_id, b.name").Order("total DESC").Scan(&bRows)
        for _, x := range bRows { resp.PurchaseByBase = append(resp.PurchaseByBase, PurchaseByBaseRow{Base: x.Name, Total: x.Total}) }

        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(resp)
        return
    }

    // Expenses
    qexp := db.DB.Table("base_expenses")
    if len(ids) > 0 { qexp = qexp.Where("base_id IN ?", ids) }
    qexp.Where("date >= ? AND date < ?", start, end+" 23:59:59").
        Select("COALESCE(SUM(amount),0)").Scan(&resp.TotalExpense)
    var erows []struct{ Name string; Total float64 }
    qeb := db.DB.Table("base_expenses be").
        Select("b.name as name, COALESCE(SUM(be.amount),0) as total").
        Joins("LEFT JOIN bases b ON be.base_id = b.id").
        Where("be.date >= ? AND be.date < ?", start, end+" 23:59:59")
    if len(ids) > 0 { qeb = qeb.Where("be.base_id IN ?", ids) }
    qeb.Group("b.name").Order("total DESC").Scan(&erows)
    for _, x := range erows { resp.ExpenseByBase = append(resp.ExpenseByBase, ExpenseByBaseRow{Base: x.Name, Total: x.Total}) }

    // Purchases total
    qpt := db.DB.Table("purchase_entries")
    if len(ids) > 0 { qpt = qpt.Where("base_id IN ?", ids) }
    qpt.Where("purchase_date >= ? AND purchase_date < ?", start, end+" 23:59:59").
        Select("COALESCE(SUM(total_amount),0)").Scan(&resp.TotalPurchase)

    // Purchases by supplier
    var ps []struct{ Supplier string; Total float64; Cnt int64 }
    qps := db.DB.Table("purchase_entries pe").
        Select("s.name as supplier, COALESCE(SUM(pe.total_amount),0) as total, COUNT(pe.id) as cnt").
        Joins("LEFT JOIN suppliers s ON pe.supplier_id = s.id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", start, end+" 23:59:59")
    if len(ids) > 0 { qps = qps.Where("pe.base_id IN ?", ids) }
    qps.Group("s.name").Order("total DESC").Scan(&ps)
    for _, x := range ps { resp.PurchaseBySupplier = append(resp.PurchaseBySupplier, PurchaseBySupplierRow{Supplier: x.Supplier, Total: x.Total, Count: x.Cnt}) }

    // Purchases by base
    var pb []struct{ Base string; Total float64 }
    qpb := db.DB.Table("purchase_entries pe").
        Select("b.name as base, COALESCE(SUM(pe.total_amount),0) as total").
        Joins("LEFT JOIN bases b ON pe.base_id = b.id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", start, end+" 23:59:59")
    if len(ids) > 0 { qpb = qpb.Where("pe.base_id IN ?", ids) }
    qpb.Group("b.name").Order("total DESC").Scan(&pb)
    for _, x := range pb { resp.PurchaseByBase = append(resp.PurchaseByBase, PurchaseByBaseRow{Base: x.Base, Total: x.Total}) }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(resp)
}

// enumerateMonths returns YYYY-MM list from start_date to end_date inclusive
func enumerateMonths(start, end string) []string {
    s, err1 := time.Parse("2006-01-02", start)
    e, err2 := time.Parse("2006-01-02", end)
    if err1 != nil || err2 != nil { return nil }
    // normalize to first day
    s = time.Date(s.Year(), s.Month(), 1, 0,0,0,0, s.Location())
    e = time.Date(e.Year(), e.Month(), 1, 0,0,0,0, e.Location())
    if s.After(e) { s, e = e, s }
    var months []string
    for cur := s; !cur.After(e); cur = cur.AddDate(0,1,0) {
        months = append(months, cur.Format("2006-01"))
    }
    return months
}

// coversWholeMonths returns true if [start,end] exactly spans whole months
// i.e., start is first day of its month and end is the last day of its month, and start <= end
func coversWholeMonths(start, end string) bool {
    s, err1 := time.Parse("2006-01-02", start)
    e, err2 := time.Parse("2006-01-02", end)
    if err1 != nil || err2 != nil { return false }
    if s.After(e) { return false }
    // start must be first day of month
    if s.Day() != 1 { return false }
    // end must be last day of month
    firstNext := time.Date(e.Year(), e.Month(), 1, 0,0,0,0, e.Location()).AddDate(0,1,0)
    lastOfMonth := firstNext.AddDate(0,0,-1).Day()
    if e.Day() != lastOfMonth { return false }
    return true
}

// spansMultipleMonths returns true if start and end are in different months (YYYY-MM differ)
func spansMultipleMonths(start, end string) bool {
    s, err1 := time.Parse("2006-01-02", start)
    e, err2 := time.Parse("2006-01-02", end)
    if err1 != nil || err2 != nil { return false }
    if s.Year() != e.Year() || s.Month() != e.Month() { return true }
    return false
}

// monthBounds returns the first day of start's month and last day of end's month as YYYY-MM-DD
func monthBounds(start, end string) (string, string, bool) {
    s, err1 := time.Parse("2006-01-02", start)
    e, err2 := time.Parse("2006-01-02", end)
    if err1 != nil || err2 != nil { return "", "", false }
    if s.After(e) { s, e = e, s }
    first := time.Date(s.Year(), s.Month(), 1, 0,0,0,0, s.Location())
    firstNext := time.Date(e.Year(), e.Month(), 1, 0,0,0,0, e.Location()).AddDate(0,1,0)
    last := firstNext.AddDate(0,0,-1)
    return first.Format("2006-01-02"), last.Format("2006-01-02"), true
}
