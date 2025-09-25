package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "time"
    "gorm.io/gorm"
    "summary/backend-rebuild/db"
    "summary/backend-rebuild/models"
)

// Update purchase: replace header + items; maintain payable links atomically
func UpdatePurchase(w http.ResponseWriter, r *http.Request) {
    id64, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id64 == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }

    var req PurchaseReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if req.BaseID == 0 { http.Error(w, "base_id required", http.StatusBadRequest); return }
    if req.SupplierID == nil || *req.SupplierID == 0 { http.Error(w, "supplier_id required", http.StatusBadRequest); return }
    if len(req.Items) == 0 { http.Error(w, "items required", http.StatusBadRequest); return }
    pd, err := time.Parse("2006-01-02", req.PurchaseDate); if err != nil { http.Error(w, "bad purchase_date", http.StatusBadRequest); return }

    // normalize total
    if req.TotalAmount <= 0 {
        var sum float64
        for _, it := range req.Items { sum += it.Quantity * it.UnitPrice }
        req.TotalAmount = sum
    }

    tx := db.DB.Begin()
    if tx.Error != nil { http.Error(w, "tx error", http.StatusInternalServerError); return }
    defer func(){ if r := recover(); r != nil { tx.Rollback() } }()

    var p models.PurchaseEntry
    if err := tx.First(&p, uint(id64)).Error; err != nil { tx.Rollback(); http.Error(w, "not found", http.StatusNotFound); return }

    // Keep old payable link to decide whether to move
    var oldLinks []models.PayableLink
    tx.Where("purchase_entry_id = ?", p.ID).Find(&oldLinks)

    // Update header
    var base models.Base
    if err := tx.First(&base, req.BaseID).Error; err != nil { tx.Rollback(); http.Error(w, "base missing", http.StatusBadRequest); return }
    cur := base.Currency
    if cur == "" { cur = "CNY" }
    p.SupplierID = req.SupplierID
    p.OrderNumber = req.OrderNumber
    p.PurchaseDate = pd
    p.TotalAmount = req.TotalAmount
    p.Currency = cur
    p.Receiver = req.Receiver
    p.BaseID = req.BaseID
    p.UpdatedAt = time.Now()
    if err := tx.Save(&p).Error; err != nil { tx.Rollback(); http.Error(w, "update purchase failed", http.StatusInternalServerError); return }

    // Replace items
    if err := tx.Where("purchase_entry_id = ?", p.ID).Delete(&models.PurchaseEntryItem{}).Error; err != nil { tx.Rollback(); http.Error(w, "clear items failed", http.StatusInternalServerError); return }
    items := make([]models.PurchaseEntryItem, len(req.Items))
    for i, it := range req.Items {
        var pid *uint = it.ProductID
        if pid == nil {
            // upsert product by name
            var prod models.Product
            if err := tx.Where("name = ?", it.ProductName).First(&prod).Error; err != nil {
                if err == gorm.ErrRecordNotFound {
                    prod = models.Product{Name: it.ProductName, Status: "active"}
                    if err := tx.Create(&prod).Error; err != nil { tx.Rollback(); http.Error(w, "create product failed", http.StatusInternalServerError); return }
                } else { tx.Rollback(); http.Error(w, "query product failed", http.StatusInternalServerError); return }
            }
            pid = &prod.ID
            var sp models.SupplierProduct
            if err := tx.Where("supplier_id = ? AND product_id = ?", *req.SupplierID, prod.ID).First(&sp).Error; err != nil {
                if err == gorm.ErrRecordNotFound {
                    sp = models.SupplierProduct{SupplierID: *req.SupplierID, ProductID: prod.ID, DefaultUnitPrice: it.UnitPrice}
                    if err := tx.Create(&sp).Error; err != nil { tx.Rollback(); http.Error(w, "create supplier product failed", http.StatusInternalServerError); return }
                } else { tx.Rollback(); http.Error(w, "query supplier product failed", http.StatusInternalServerError); return }
            }
        }
        amt := it.Amount; if amt <= 0 { amt = it.UnitPrice * it.Quantity }
        items[i] = models.PurchaseEntryItem{PurchaseEntryID: p.ID, ProductID: pid, ProductName: it.ProductName, Quantity: it.Quantity, UnitPrice: it.UnitPrice, Amount: amt}
    }
    if len(items) > 0 {
        if err := tx.Create(&items).Error; err != nil { tx.Rollback(); http.Error(w, "create items failed", http.StatusInternalServerError); return }
    }

    // Ensure payable link points to correct payable and amount equals total
    // Determine target payable by supplier/base/period
    var sup models.Supplier
    if err := tx.First(&sup, *req.SupplierID).Error; err != nil { tx.Rollback(); http.Error(w, "supplier missing", http.StatusBadRequest); return }
    periodMonth, periodHalf, due := computePeriod(pd, sup.SettlementType, sup.SettlementDay)
    target, err := findOrCreateOpenPayable(tx, *req.SupplierID, req.BaseID, sup.SettlementType, periodMonth, periodHalf, due, cur)
    if err != nil { tx.Rollback(); http.Error(w, "find payable failed", http.StatusInternalServerError); return }

    if len(oldLinks) == 0 {
        // create new link
        if err := tx.Create(&models.PayableLink{PayableRecordID: target.ID, PurchaseEntryID: p.ID, Amount: p.TotalAmount, Currency: cur}).Error; err != nil { tx.Rollback(); http.Error(w, "create link failed", http.StatusInternalServerError); return }
        if err := recalcPayable(tx, target.ID); err != nil { tx.Rollback(); http.Error(w, err.Error(), http.StatusInternalServerError); return }
    } else {
        // Update/move existing link (assume single link typical)
        link := oldLinks[0]
        if link.PayableRecordID != target.ID {
            if err := tx.Delete(&link).Error; err != nil { tx.Rollback(); http.Error(w, "delete old link failed", http.StatusInternalServerError); return }
            if err := tx.Create(&models.PayableLink{PayableRecordID: target.ID, PurchaseEntryID: p.ID, Amount: p.TotalAmount, Currency: cur}).Error; err != nil { tx.Rollback(); http.Error(w, "create new link failed", http.StatusInternalServerError); return }
            // recalc both old and new
            if err := recalcPayable(tx, link.PayableRecordID); err != nil { tx.Rollback(); http.Error(w, err.Error(), http.StatusInternalServerError); return }
            if err := recalcPayable(tx, target.ID); err != nil { tx.Rollback(); http.Error(w, err.Error(), http.StatusInternalServerError); return }
        } else {
            // same payable, just update amount
            if err := tx.Model(&models.PayableLink{}).Where("id = ?", link.ID).Update("amount", p.TotalAmount).Error; err != nil { tx.Rollback(); http.Error(w, "update link failed", http.StatusInternalServerError); return }
            if err := recalcPayable(tx, target.ID); err != nil { tx.Rollback(); http.Error(w, err.Error(), http.StatusInternalServerError); return }
        }
    }

    if err := tx.Commit().Error; err != nil { http.Error(w, "commit failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(p)
}

func recalcPayable(tx *gorm.DB, payableID uint) error {
    var sum float64
    if err := tx.Model(&models.PayableLink{}).Where("payable_record_id = ?", payableID).Select("COALESCE(SUM(amount),0)").Scan(&sum).Error; err != nil { return err }
    var pr models.PayableRecord
    if err := tx.First(&pr, payableID).Error; err != nil { return err }
    pr.TotalAmount = sum
    // recalc paid
    var paid float64
    if err := tx.Model(&models.PaymentRecord{}).Where("payable_record_id = ?", payableID).Select("COALESCE(SUM(payment_amount),0)").Scan(&paid).Error; err != nil { return err }
    pr.PaidAmount = paid
    pr.UpdateAmounts()
    pr.UpdatedAt = time.Now()
    return tx.Save(&pr).Error
}

func DeletePurchase(w http.ResponseWriter, r *http.Request) {
    id64, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
    if id64 == 0 { http.Error(w, "invalid id", http.StatusBadRequest); return }
    id := uint(id64)

    tx := db.DB.Begin()
    if tx.Error != nil { http.Error(w, "tx error", http.StatusInternalServerError); return }

    // find affected payables via links
    var links []models.PayableLink
    tx.Where("purchase_entry_id = ?", id).Find(&links)
    payableIDs := map[uint]struct{}{}
    for _, l := range links { payableIDs[l.PayableRecordID] = struct{}{} }

    if err := tx.Where("purchase_entry_id = ?", id).Delete(&models.PayableLink{}).Error; err != nil { tx.Rollback(); http.Error(w, "delete links failed", http.StatusInternalServerError); return }
    if err := tx.Where("purchase_entry_id = ?", id).Delete(&models.PurchaseEntryItem{}).Error; err != nil { tx.Rollback(); http.Error(w, "delete items failed", http.StatusInternalServerError); return }
    if err := tx.Delete(&models.PurchaseEntry{}, id).Error; err != nil { tx.Rollback(); http.Error(w, "delete purchase failed", http.StatusInternalServerError); return }

    for pid := range payableIDs { if err := recalcPayable(tx, pid); err != nil { tx.Rollback(); http.Error(w, err.Error(), http.StatusInternalServerError); return } }

    if err := tx.Commit().Error; err != nil { http.Error(w, "commit failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

func BatchDeletePurchase(w http.ResponseWriter, r *http.Request) {
    var body struct { IDs []uint `json:"ids"` }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil { http.Error(w, "bad body", http.StatusBadRequest); return }
    if len(body.IDs) == 0 { http.Error(w, "ids required", http.StatusBadRequest); return }

    tx := db.DB.Begin()
    if tx.Error != nil { http.Error(w, "tx error", http.StatusInternalServerError); return }

    // gather affected payable ids
    var links []models.PayableLink
    tx.Where("purchase_entry_id IN ?", body.IDs).Find(&links)
    payableIDs := map[uint]struct{}{}
    for _, l := range links { payableIDs[l.PayableRecordID] = struct{}{} }

    if err := tx.Where("purchase_entry_id IN ?", body.IDs).Delete(&models.PayableLink{}).Error; err != nil { tx.Rollback(); http.Error(w, "delete links failed", http.StatusInternalServerError); return }
    if err := tx.Where("purchase_entry_id IN ?", body.IDs).Delete(&models.PurchaseEntryItem{}).Error; err != nil { tx.Rollback(); http.Error(w, "delete items failed", http.StatusInternalServerError); return }
    if err := tx.Where("id IN ?", body.IDs).Delete(&models.PurchaseEntry{}).Error; err != nil { tx.Rollback(); http.Error(w, "delete purchases failed", http.StatusInternalServerError); return }
    for pid := range payableIDs { if err := recalcPayable(tx, pid); err != nil { tx.Rollback(); http.Error(w, err.Error(), http.StatusInternalServerError); return } }

    if err := tx.Commit().Error; err != nil { http.Error(w, "commit failed", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(map[string]int{"deleted_count": len(body.IDs)})
}

// Suggestions
func SupplierSuggestions(w http.ResponseWriter, r *http.Request) {
    limit := 15
    if s := r.URL.Query().Get("limit"); s != "" { if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 50 { limit = n } }
    type Row struct { ID uint `json:"id"`; Name string `json:"name"`; Cnt int64 `json:"count"` }
    var rows []Row
    db.DB.Table("suppliers s").
        Select("s.id, s.name, COUNT(pe.id) as cnt").
        Joins("LEFT JOIN purchase_entries pe ON pe.supplier_id = s.id").
        Group("s.id, s.name").
        Order("cnt DESC, s.updated_at DESC").
        Limit(limit).Scan(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}

func ProductSuggestions(w http.ResponseWriter, r *http.Request) {
    sid, _ := strconv.ParseUint(r.URL.Query().Get("supplier_id"), 10, 64)
    if sid == 0 { http.Error(w, "supplier_id required", http.StatusBadRequest); return }
    limit := 15
    if s := r.URL.Query().Get("limit"); s != "" { if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 100 { limit = n } }
    type Row struct {
        ProductName string  `json:"product_name"`
        AvgPrice    float64 `json:"avg_price"`
        Times       int64   `json:"times"`
        LastDate    string  `json:"last_date"`
    }
    var rows []Row
    db.DB.Table("purchase_entry_items pei").
        Select("pei.product_name, AVG(pei.unit_price) as avg_price, COUNT(*) as times, DATE_FORMAT(MAX(pe.purchase_date), '%Y-%m-%d') as last_date").
        Joins("JOIN purchase_entries pe ON pe.id = pei.purchase_entry_id").
        Where("pe.supplier_id = ?", uint(sid)).
        Group("pei.product_name").
        Order("times DESC, MAX(pe.purchase_date) DESC").
        Limit(limit).Scan(&rows)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(rows)
}
