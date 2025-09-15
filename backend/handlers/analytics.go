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

    // 可选：基地限制（base_agent）
    var baseIDFilter *uint
    if role == "base_agent" {
        baseName, _ := claims["base"].(string)
        var base models.Base
        if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
            baseIDFilter = &base.ID
        }
    }

    resp := TimeRangeSummaryResponse{StartDate: start, EndDate: end}

    // 1) 开支总额
    expQ := db.DB.Model(&models.BaseExpense{}).Where("date >= ? AND date < ?", startTime, endTime)
    if baseIDFilter != nil {
        expQ = expQ.Where("base_id = ?", *baseIDFilter)
    }
    expQ.Select("COALESCE(SUM(amount),0)").Scan(&resp.TotalExpense)

    // 1.1) 各基地开支
    var expByBase []struct{ Name string; Total float64 }
    expByBaseQ := db.DB.Table("base_expenses be").
        Select("b.name as name, COALESCE(SUM(be.amount),0) as total").
        Joins("LEFT JOIN bases b ON be.base_id = b.id").
        Where("be.date >= ? AND be.date < ?", startTime, endTime)
    if baseIDFilter != nil { expByBaseQ = expByBaseQ.Where("be.base_id = ?", *baseIDFilter) }
    expByBaseQ.Group("b.name").Order("total DESC").Scan(&expByBase)
    for _, x := range expByBase {
        resp.ExpenseByBase = append(resp.ExpenseByBase, ExpenseByBase{Base: x.Name, Total: x.Total})
    }

    // 2) 采购总额（按采购日期）
    purQ := db.DB.Model(&models.PurchaseEntry{}).Where("purchase_date >= ? AND purchase_date < ?", startTime, endTime)
    if baseIDFilter != nil { purQ = purQ.Where("base_id = ?", *baseIDFilter) }
    purQ.Select("COALESCE(SUM(total_amount),0)").Scan(&resp.TotalPurchase)

    // 2.1) 各供应商采购总额
    var purBySupp []struct{ Supplier string; Total float64; Cnt int64 }
    purBySuppQ := db.DB.Table("purchase_entries pe").
        Select("s.name as supplier, COALESCE(SUM(pe.total_amount),0) as total, COUNT(pe.id) as cnt").
        Joins("LEFT JOIN suppliers s ON pe.supplier_id = s.id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", startTime, endTime)
    if baseIDFilter != nil { purBySuppQ = purBySuppQ.Where("pe.base_id = ?", *baseIDFilter) }
    purBySuppQ.Group("s.name").Order("total DESC").Scan(&purBySupp)
    for _, x := range purBySupp { resp.PurchaseBySupplier = append(resp.PurchaseBySupplier, PurchaseBySupplier{Supplier: x.Supplier, Total: x.Total, Count: x.Cnt}) }

    // 2.2) 各基地采购总额
    var purByBase []struct{ Base string; Total float64 }
    purByBaseQ := db.DB.Table("purchase_entries pe").
        Select("b.name as base, COALESCE(SUM(pe.total_amount),0) as total").
        Joins("LEFT JOIN bases b ON pe.base_id = b.id").
        Where("pe.purchase_date >= ? AND pe.purchase_date < ?", startTime, endTime)
    if baseIDFilter != nil { purByBaseQ = purByBaseQ.Where("pe.base_id = ?", *baseIDFilter) }
    purByBaseQ.Group("b.name").Order("total DESC").Scan(&purByBase)
    for _, x := range purByBase { resp.PurchaseByBase = append(resp.PurchaseByBase, PurchaseByBase{Base: x.Base, Total: x.Total}) }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}
