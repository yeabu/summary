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

// getRatesMap returns currency->rate_to_cny with default CNY=1
func getRatesMap() map[string]float64 {
    rates := map[string]float64{"CNY": 1}
    var rows []struct{ Currency string; RateToCNY float64 }
    db.DB.Table("exchange_rates").Select("currency, rate_to_cny").Scan(&rows)
    for _, r := range rows {
        if r.Currency != "" { rates[r.Currency] = r.RateToCNY }
    }
    return rates
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
        rates := getRatesMap()
        // Expenses by base from mv_base_expense_month
        type eRow struct{ BaseID uint; Name string; Curr string; Total float64 }
        var eRows []eRow
        qeb := db.DB.Table("mv_base_expense_month m").
            Select("m.base_id as base_id, b.name as name, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(m.total_amount),0) as total").
            Joins("JOIN bases b ON b.id = m.base_id").
            Where("m.month IN ?", months)
        if len(ids) > 0 { qeb = qeb.Where("m.base_id IN ?", ids) }
        qeb.Group("m.base_id, b.name").Scan(&eRows)
        var totalExp float64
        for _, x := range eRows { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; v := x.Total * rate; totalExp += v; resp.ExpenseByBase = append(resp.ExpenseByBase, ExpenseByBaseRow{Base: x.Name, Total: v}) }
        resp.TotalExpense = totalExp

        // Purchases from mv_supplier_monthly_spend
        type sRow struct{ SupplierID *uint; Name string; Curr string; Total float64; Cnt uint64 }
        var sRows []sRow
        qps := db.DB.Table("mv_supplier_monthly_spend m").
            Select("COALESCE(s.id, NULL) as supplier_id, COALESCE(s.name, '-') as name, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(m.total_purchase),0) as total, COALESCE(SUM(m.purchase_count),0) as cnt").
            Joins("LEFT JOIN suppliers s ON s.id = m.supplier_id").
            Joins("JOIN bases b ON b.id = m.base_id").
            Where("m.month IN ?", months)
        if len(ids) > 0 { qps = qps.Where("m.base_id IN ?", ids) }
        qps.Group("s.id, s.name").Order("total DESC").Scan(&sRows)
        var totalPur float64
        for _, x := range sRows { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; v := x.Total * rate; totalPur += v; resp.PurchaseBySupplier = append(resp.PurchaseBySupplier, PurchaseBySupplierRow{Supplier: x.Name, Total: v, Count: int64(x.Cnt)}) }
        resp.TotalPurchase = totalPur

        // Purchases by base
        type bRow struct{ BaseID uint; Name string; Curr string; Total float64 }
        var bRows []bRow
        qpb := db.DB.Table("mv_supplier_monthly_spend m").
            Select("m.base_id as base_id, b.name as name, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(m.total_purchase),0) as total").
            Joins("JOIN bases b ON b.id = m.base_id").
            Where("m.month IN ?", months)
        if len(ids) > 0 { qpb = qpb.Where("m.base_id IN ?", ids) }
        qpb.Group("m.base_id, b.name").Order("total DESC").Scan(&bRows)
        for _, x := range bRows { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; resp.PurchaseByBase = append(resp.PurchaseByBase, PurchaseByBaseRow{Base: x.Name, Total: x.Total * rate}) }

        w.Header().Set("Content-Type", "application/json")
        _ = json.NewEncoder(w).Encode(resp)
        return
    }

    // Expenses (convert to CNY by base currency)
    rates := getRatesMap()
    var expByCurr []struct{ Curr string; Total float64 }
    qexp2 := db.DB.Table("base_expenses be").
        Select("COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(be.amount),0) as total").
        Joins("LEFT JOIN bases b ON b.id = be.base_id").
        Where("be.date >= ? AND be.date < ?", start, end+" 23:59:59")
    if len(ids) > 0 { qexp2 = qexp2.Where("be.base_id IN ?", ids) }
    qexp2.Group("curr").Scan(&expByCurr)
    for _, r0 := range expByCurr { rate := rates[r0.Curr]; if rate == 0 { rate = 1 }; resp.TotalExpense += r0.Total * rate }

    var erows []struct{ Name string; Curr string; Total float64 }
    qeb := db.DB.Table("base_expenses be").
        Select("b.name as name, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(be.amount),0) as total").
        Joins("LEFT JOIN bases b ON be.base_id = b.id").
        Where("be.date >= ? AND be.date < ?", start, end+" 23:59:59")
    if len(ids) > 0 { qeb = qeb.Where("be.base_id IN ?", ids) }
    qeb.Group("b.name, curr").Order("total DESC").Scan(&erows)
    for _, x := range erows { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; resp.ExpenseByBase = append(resp.ExpenseByBase, ExpenseByBaseRow{Base: x.Name, Total: x.Total * rate}) }

    // Purchases total (convert via base currency)
    var pByCurr []struct{ Curr string; Total float64 }
    qpt := db.DB.Table("purchase_entries pe").
        Select("COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(pe.total_amount),0) as total").
        Joins("LEFT JOIN bases b ON b.id = pe.base_id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", start, end+" 23:59:59")
    if len(ids) > 0 { qpt = qpt.Where("pe.base_id IN ?", ids) }
    qpt.Group("curr").Scan(&pByCurr)
    for _, r0 := range pByCurr { rate := rates[r0.Curr]; if rate == 0 { rate = 1 }; resp.TotalPurchase += r0.Total * rate }

    // Purchases by supplier
    var ps []struct{ Supplier string; Curr string; Total float64; Cnt int64 }
    qps := db.DB.Table("purchase_entries pe").
        Select("s.name as supplier, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(pe.total_amount),0) as total, COUNT(pe.id) as cnt").
        Joins("LEFT JOIN suppliers s ON pe.supplier_id = s.id").
        Joins("LEFT JOIN bases b ON b.id = pe.base_id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", start, end+" 23:59:59")
    if len(ids) > 0 { qps = qps.Where("pe.base_id IN ?", ids) }
    qps.Group("s.name, curr").Order("total DESC").Scan(&ps)
    for _, x := range ps { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; resp.PurchaseBySupplier = append(resp.PurchaseBySupplier, PurchaseBySupplierRow{Supplier: x.Supplier, Total: x.Total * rate, Count: x.Cnt}) }

    // Purchases by base
    var pb []struct{ Base string; Curr string; Total float64 }
    qpb := db.DB.Table("purchase_entries pe").
        Select("b.name as base, COALESCE(b.currency,'CNY') as curr, COALESCE(SUM(pe.total_amount),0) as total").
        Joins("LEFT JOIN bases b ON pe.base_id = b.id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", start, end+" 23:59:59")
    if len(ids) > 0 { qpb = qpb.Where("pe.base_id IN ?", ids) }
    qpb.Group("b.name, curr").Order("total DESC").Scan(&pb)
    for _, x := range pb { rate := rates[x.Curr]; if rate == 0 { rate = 1 }; resp.PurchaseByBase = append(resp.PurchaseByBase, PurchaseByBaseRow{Base: x.Base, Total: x.Total * rate}) }

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
