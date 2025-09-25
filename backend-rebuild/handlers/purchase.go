package handlers

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"
    "gorm.io/gorm"
    "gorm.io/gorm/clause"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
)

type PurchaseItemReq struct {
    ProductID   *uint    `json:"product_id,omitempty"`
    ProductName string   `json:"product_name"`
    Unit        string   `json:"unit"`
    Quantity    float64  `json:"quantity"`
    UnitPrice   float64  `json:"unit_price"`
    Amount      float64  `json:"amount"`
}

type PurchaseReq struct {
    SupplierID   *uint            `json:"supplier_id,omitempty"`
    OrderNumber  string           `json:"order_number"`
    PurchaseDate string           `json:"purchase_date"` // yyyy-mm-dd
    TotalAmount  float64          `json:"total_amount"`
    Receiver     string           `json:"receiver"`
    BaseID       uint             `json:"base_id"`
    Items        []PurchaseItemReq `json:"items"`
}

// CreatePurchase refactored: assign product_id, maintain payable+links atomically
func CreatePurchase(w http.ResponseWriter, r *http.Request) {
    // Idempotency: return existing resource if key seen
    if key := r.Header.Get("Idempotency-Key"); key != "" {
        var idem models.IdempotencyKey
        if err := db.DB.Where("`key` = ? AND resource = ?", key, "purchase").First(&idem).Error; err == nil && idem.RefID != 0 {
            var existed models.PurchaseEntry
            if err := db.DB.Preload("Items").First(&existed, idem.RefID).Error; err == nil {
                w.Header().Set("Content-Type", "application/json")
                _ = json.NewEncoder(w).Encode(existed)
                return
            }
        }
    }
    var req PurchaseReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "参数错误", http.StatusBadRequest)
        return
    }

    if req.SupplierID == nil || *req.SupplierID == 0 { http.Error(w, "supplier_id 必填", http.StatusBadRequest); return }
    if req.BaseID == 0 { http.Error(w, "base_id 必填", http.StatusBadRequest); return }
    if len(req.Items) == 0 { http.Error(w, "采购明细不能为空", http.StatusBadRequest); return }
    pd, err := time.Parse("2006-01-02", req.PurchaseDate)
    if err != nil { http.Error(w, "purchase_date 格式错误", http.StatusBadRequest); return }

    // total fallback
    if req.TotalAmount <= 0 {
        var sum float64
        for _, it := range req.Items { sum += it.Quantity * it.UnitPrice }
        req.TotalAmount = sum
    }

    tx := db.DB.Begin()
    if tx.Error != nil { http.Error(w, "数据库事务启动失败", http.StatusInternalServerError); return }
    defer func() {
        if r := recover(); r != nil { tx.Rollback() }
    }()

    // Validate foreigns
    var sup models.Supplier
    if err := tx.First(&sup, *req.SupplierID).Error; err != nil { tx.Rollback(); http.Error(w, "供应商不存在", http.StatusBadRequest); return }
    var base models.Base
    if err := tx.First(&base, req.BaseID).Error; err != nil { tx.Rollback(); http.Error(w, "基地不存在", http.StatusBadRequest); return }

    // Determine currency: prefer base currency if set, else default CNY
    cur := base.Currency
    if cur == "" { cur = "CNY" }

    // Upsert products (by name) and set ProductID on items if needed; also fill suggested price when unit_price is empty
    items := make([]models.PurchaseEntryItem, len(req.Items))
    for i, it := range req.Items {
        var pid *uint = it.ProductID
        if pid == nil {
            // create/find product by name
            if it.ProductName == "" { tx.Rollback(); http.Error(w, "商品名称不能为空", http.StatusBadRequest); return }
            var p models.Product
            if err := tx.Where("name = ?", it.ProductName).First(&p).Error; err != nil {
                if err == gorm.ErrRecordNotFound {
                    p = models.Product{Name: it.ProductName, Status: "active"}
                    if err := tx.Create(&p).Error; err != nil { tx.Rollback(); http.Error(w, "创建商品失败", http.StatusInternalServerError); return }
                } else { tx.Rollback(); http.Error(w, "查询商品失败", http.StatusInternalServerError); return }
            }
            pid = &p.ID
            // ensure SupplierProduct exists
            var sp models.SupplierProduct
            if err := tx.Where("supplier_id = ? AND product_id = ?", *req.SupplierID, p.ID).First(&sp).Error; err != nil {
                if err == gorm.ErrRecordNotFound {
                    sp = models.SupplierProduct{SupplierID: *req.SupplierID, ProductID: p.ID, DefaultUnitPrice: it.UnitPrice}
                    if err := tx.Create(&sp).Error; err != nil { tx.Rollback(); http.Error(w, "创建供应商商品失败", http.StatusInternalServerError); return }
                } else { tx.Rollback(); http.Error(w, "查询供应商商品失败", http.StatusInternalServerError); return }
            }
        }
        if it.UnitPrice <= 0 {
            if pid != nil {
                if price, ok := suggestPrice(tx, *req.SupplierID, *pid, it.ProductName); ok { it.UnitPrice = price }
            } else if it.ProductName != "" {
                if price, ok := suggestPrice(tx, *req.SupplierID, 0, it.ProductName); ok { it.UnitPrice = price }
            }
        }
        // compute quantity_base by conversion
        var qbase = it.Quantity
        if pid != nil {
            if f, ok := getFactorToBase(tx, *pid, it.Unit); ok { qbase = it.Quantity * f }
        }
        amt := it.Amount
        if amt <= 0 { amt = it.UnitPrice * it.Quantity }
        items[i] = models.PurchaseEntryItem{ ProductID: pid, ProductName: it.ProductName, Unit: it.Unit, Quantity: it.Quantity, UnitPrice: it.UnitPrice, Amount: amt, QuantityBase: qbase }
    }

    // Create purchase entry
    p := models.PurchaseEntry{
        SupplierID: req.SupplierID,
        OrderNumber: req.OrderNumber,
        PurchaseDate: pd,
        TotalAmount: req.TotalAmount,
        Currency: cur,
        Receiver: req.Receiver,
        BaseID: req.BaseID,
        CreatedBy: 0,
        CreatorName: "",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    if err := tx.Create(&p).Error; err != nil { tx.Rollback(); http.Error(w, "创建采购记录失败", http.StatusInternalServerError); return }
    for i := range items { items[i].PurchaseEntryID = p.ID }
    if err := tx.Create(&items).Error; err != nil { tx.Rollback(); http.Error(w, "创建采购明细失败", http.StatusInternalServerError); return }

    // Payable aggregation
    periodMonth, periodHalf, due := computePeriod(pd, sup.SettlementType, sup.SettlementDay)
    payable, err := findOrCreateOpenPayable(tx, *req.SupplierID, req.BaseID, sup.SettlementType, periodMonth, periodHalf, due, cur)
    if err != nil { tx.Rollback(); http.Error(w, err.Error(), http.StatusInternalServerError); return }

    // Link purchase to payable
    link := models.PayableLink{ PayableRecordID: payable.ID, PurchaseEntryID: p.ID, Amount: req.TotalAmount, Currency: cur }
    if err := tx.Create(&link).Error; err != nil { tx.Rollback(); http.Error(w, "创建应付款链接失败", http.StatusInternalServerError); return }

    // Recalc payable totals from links
    var sum float64
    if err := tx.Model(&models.PayableLink{}).Where("payable_record_id = ?", payable.ID).Select("COALESCE(SUM(amount),0)").Scan(&sum).Error; err != nil { tx.Rollback(); http.Error(w, "汇总应付款失败", http.StatusInternalServerError); return }
    payable.TotalAmount = sum
    payable.UpdateAmounts()
    if err := tx.Save(&payable).Error; err != nil { tx.Rollback(); http.Error(w, "更新应付款失败", http.StatusInternalServerError); return }

    if err := tx.Commit().Error; err != nil { http.Error(w, "提交事务失败", http.StatusInternalServerError); return }
    if key := r.Header.Get("Idempotency-Key"); key != "" {
        _ = db.DB.Create(&models.IdempotencyKey{Key: key, Resource: "purchase", RefID: p.ID, CreatedAt: time.Now()}).Error
    }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(p)
}

func computePeriod(pd time.Time, settlementType string, settlementDay *int) (periodMonth string, periodHalf string, due *time.Time) {
    switch settlementType {
    case "monthly":
        periodMonth = pd.Format("2006-01")
        // due date = next month on settlementDay (or last day of next month if overflow)
        y := pd.Year(); m := int(pd.Month());
        nm := m + 1; ny := y; if nm > 12 { nm = 1; ny = y + 1 }
        d := 28
        if settlementDay != nil { d = *settlementDay }
        dt := time.Date(ny, time.Month(nm), 1, 0,0,0,0, pd.Location())
        last := dt.AddDate(0,1,-1).Day()
        if d > last { d = last }
        dd := time.Date(ny, time.Month(nm), d, 23,59,59,0, pd.Location())
        due = &dd
    case "immediate":
        dd := pd.AddDate(0,0,30) // default 30 days
        due = &dd
    default: // flexible: half-year
        half := "H1"; if pd.Month() >= 7 { half = "H2" }
        periodHalf = fmt.Sprintf("%04d-%s", pd.Year(), half)
        due = nil
    }
    return
}

func findOrCreateOpenPayable(tx *gorm.DB, supplierID, baseID uint, settlementType, periodMonth, periodHalf string, due *time.Time, currency string) (models.PayableRecord, error) {
    var pr models.PayableRecord
    // Lock rows for this supplier+base to prevent concurrent duplicate creation (gap lock on index range)
    tx.Table("payable_records").Where("supplier_id = ? AND base_id = ?", supplierID, baseID).Clauses(clause.Locking{Strength: "UPDATE"}).Select("id").Find(&[]struct{}{})
    q := tx.Where("supplier_id = ? AND base_id = ? AND status <> ?", supplierID, baseID, "paid").
        Where("settlement_type = ?", settlementType)
    if periodMonth != "" { q = q.Where("period_month = ?", periodMonth) }
    if periodHalf != "" { q = q.Where("period_half = ?", periodHalf) }
    if err := q.Clauses(clause.Locking{Strength: "UPDATE"}).First(&pr).Error; err != nil {
        if err != gorm.ErrRecordNotFound { return pr, err }
        pr = models.PayableRecord{
            SupplierID: &supplierID,
            BaseID: baseID,
            PeriodMonth: periodMonth,
            PeriodHalf: periodHalf,
            SettlementType: settlementType,
            DueDate: due,
            TotalAmount: 0,
            PaidAmount: 0,
            RemainingAmount: 0,
            Currency: currency,
            Status: "pending",
            CreatedAt: time.Now(),
            UpdatedAt: time.Now(),
        }
        if err := tx.Create(&pr).Error; err != nil { return pr, err }
    }
    return pr, nil
}

// suggestPrice returns latest known unit price for supplier+product or by recent purchase name
func suggestPrice(tx *gorm.DB, supplierID uint, productID uint, productName string) (float64, bool) {
    var price float64
    if productID != 0 {
        if err := tx.Table("supplier_product_prices").
            Where("supplier_id = ? AND product_id = ?", supplierID, productID).
            Order("effective_from DESC").
            Limit(1).Select("price").Scan(&price).Error; err == nil && price > 0 {
            return price, true
        }
        if err := tx.Table("supplier_products").
            Where("supplier_id = ? AND product_id = ?", supplierID, productID).
            Select("default_unit_price").Scan(&price).Error; err == nil && price > 0 {
            return price, true
        }
    }
    if productName != "" {
        if err := tx.Table("purchase_entry_items pei").
            Joins("JOIN purchase_entries pe ON pe.id = pei.purchase_entry_id").
            Where("pe.supplier_id = ? AND pei.product_name = ?", supplierID, productName).
            Order("pe.purchase_date DESC").Limit(1).Select("pei.unit_price").Scan(&price).Error; err == nil && price > 0 {
            return price, true
        }
    }
    return 0, false
}

func getFactorToBase(tx *gorm.DB, productID uint, unit string) (float64, bool) {
    if unit == "" { return 1, true }
    var f float64
    if err := tx.Table("product_unit_specs").
        Where("product_id = ? AND unit = ?", productID, unit).
        Select("factor_to_base").Scan(&f).Error; err == nil && f > 0 {
        return f, true
    }
    return 1, false
}
