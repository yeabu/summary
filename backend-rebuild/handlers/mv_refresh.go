package handlers

import (
    "encoding/json"
    "net/http"
    "time"
    "summary/backend-rebuild/db"
)

// Admin endpoint: recompute materialized monthly tables for a month (YYYY-MM). If empty, recompute current month.
func RefreshMonthlyMaterialized(w http.ResponseWriter, r *http.Request) {
    m := r.URL.Query().Get("month")
    if len(m) != 7 {
        m = time.Now().Format("2006-01")
    }
    if err := RecomputeMonthly(m); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"refreshed", "month": m})
}

// RecomputeMonthly rebuilds MV tables for a given YYYY-MM
func RecomputeMonthly(month string) error {
    t, _ := time.Parse("2006-01", month)
    start := t.Format("2006-01-02")
    end := t.AddDate(0,1,0).Format("2006-01-02")

    // mv_supplier_monthly_spend
    db.DB.Exec("DELETE FROM mv_supplier_monthly_spend WHERE month = ?", month)
    // Step 1: insert totals from purchase_entries (purchase_count + total_purchase)
    if err := db.DB.Exec(`INSERT INTO mv_supplier_monthly_spend (supplier_id, base_id, month, total_purchase, purchase_count, total_paid, remaining, generated_at)
                SELECT COALESCE(supplier_id,0), base_id, ?, COALESCE(SUM(total_amount),0), COUNT(*), 0, 0, NOW()
                FROM purchase_entries
                WHERE purchase_date >= ? AND purchase_date < ?
                GROUP BY supplier_id, base_id`, month, start, end).Error; err != nil { return err }
    // Step 2: update total_paid and remaining from payable_records (created during the same month)
    if err := db.DB.Exec(`UPDATE mv_supplier_monthly_spend m
                JOIN (
                    SELECT COALESCE(supplier_id,0) as supplier_id, base_id, COALESCE(SUM(paid_amount),0) as paid, COALESCE(SUM(remaining_amount),0) as rem
                    FROM payable_records
                    WHERE created_at >= ? AND created_at < ?
                    GROUP BY supplier_id, base_id
                ) p ON p.supplier_id = m.supplier_id AND p.base_id = m.base_id AND m.month = ?
                SET m.total_paid = p.paid, m.remaining = p.rem`, start, end, month).Error; err != nil { return err }

    // mv_base_expense_month
    if err := db.DB.Exec("DELETE FROM mv_base_expense_month WHERE month = ?", month).Error; err != nil { return err }
    if err := db.DB.Exec(`INSERT INTO mv_base_expense_month (base_id, month, total_amount, generated_at)
                SELECT base_id, ?, COALESCE(SUM(amount),0), NOW()
                FROM base_expenses
                WHERE date >= ? AND date < ?
                GROUP BY base_id`, month, start, end).Error; err != nil { return err }
    return nil
}

// Admin endpoint: recompute materialized tables for a month range [start,end], inclusive.
// Params: start=YYYY-MM, end=YYYY-MM (end defaults to start; start defaults to current month)
func RefreshMonthlyRange(w http.ResponseWriter, r *http.Request) {
    start := r.URL.Query().Get("start")
    end := r.URL.Query().Get("end")
    if len(start) != 7 { start = time.Now().Format("2006-01") }
    if len(end) != 7 { end = start }
    months := monthsBetween(start, end)
    for _, m := range months {
        if err := RecomputeMonthly(m); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
    }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]interface{}{"message": "refreshed", "months": months})
}

func monthsBetween(start, end string) []string {
    s, err1 := time.Parse("2006-01", start)
    e, err2 := time.Parse("2006-01", end)
    if err1 != nil || err2 != nil { return []string{start} }
    if s.After(e) { s, e = e, s }
    var out []string
    for cur := time.Date(s.Year(), s.Month(), 1, 0,0,0,0, time.UTC); !cur.After(e); cur = cur.AddDate(0,1,0) {
        out = append(out, cur.Format("2006-01"))
    }
    return out
}
