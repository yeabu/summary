package handlers

import (
    "backend/db"
    "backend/middleware"
    "backend/models"
    "encoding/json"
    "net/http"
    "strconv"
    "strings"
)

// GetProductPurchaseParam 获取商品的采购参数
func GetProductPurchaseParam(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    pidStr := r.URL.Query().Get("product_id")
    pid, _ := strconv.Atoi(pidStr)
    if pid <= 0 { http.Error(w, "product_id 无效", http.StatusBadRequest); return }
    var p models.ProductPurchaseParam
    if err := db.DB.Where("product_id = ?", pid).First(&p).Error; err != nil {
        w.Header().Set("Content-Type", "application/json")
        w.Write([]byte("null"))
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(p)
}

type purchaseParamReq struct {
    ProductID     uint    `json:"product_id"`
    Unit          string  `json:"unit"`
    FactorToBase  float64 `json:"factor_to_base"`
    PurchasePrice float64 `json:"purchase_price"`
}

// UpsertProductPurchaseParam 新增或更新商品采购参数（管理员）
func UpsertProductPurchaseParam(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" && role != "base_agent" { http.Error(w, "无权限", http.StatusForbidden); return }
    var req purchaseParamReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "参数错误", http.StatusBadRequest); return }
    if req.ProductID == 0 || strings.TrimSpace(req.Unit) == "" || req.FactorToBase <= 0 || req.PurchasePrice <= 0 {
        http.Error(w, "参数不完整", http.StatusBadRequest); return
    }
    var cur models.ProductPurchaseParam
    if err := db.DB.Where("product_id = ?", req.ProductID).First(&cur).Error; err == nil {
        cur.Unit = strings.TrimSpace(req.Unit)
        cur.FactorToBase = req.FactorToBase
        cur.PurchasePrice = req.PurchasePrice
        // 同步币种为商品的币种
        var prod models.Product
        if e := db.DB.First(&prod, req.ProductID).Error; e == nil && prod.Currency != "" { cur.Currency = prod.Currency }
        if err := db.DB.Save(&cur).Error; err != nil { http.Error(w, "更新失败", http.StatusInternalServerError); return }
        // 同步到规格表：保证存在 purchase 类型的规格，并设为默认
        var spec models.ProductUnitSpec
        if err := db.DB.Where("product_id = ? AND unit = ?", req.ProductID, req.Unit).First(&spec).Error; err == nil {
            spec.FactorToBase = req.FactorToBase
            spec.Kind = "purchase"
            spec.IsDefault = true
            _ = db.DB.Save(&spec).Error
        } else {
            spec = models.ProductUnitSpec{ ProductID: req.ProductID, Unit: strings.TrimSpace(req.Unit), FactorToBase: req.FactorToBase, Kind: "purchase", IsDefault: true }
            _ = db.DB.Create(&spec).Error
        }
        // 取消同商品其他规格的默认标记
        _ = db.DB.Model(&models.ProductUnitSpec{}).Where("product_id = ? AND id <> ?", req.ProductID, spec.ID).Update("is_default", false).Error
        w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(cur); return
    }
    // 初次创建时从商品继承币种
    var prod models.Product
    _ = db.DB.First(&prod, req.ProductID).Error
    cur = models.ProductPurchaseParam{ ProductID: req.ProductID, Unit: strings.TrimSpace(req.Unit), FactorToBase: req.FactorToBase, PurchasePrice: req.PurchasePrice, Currency: func() string { if prod.Currency != "" { return prod.Currency }; return "CNY" }() }
    if err := db.DB.Create(&cur).Error; err != nil { http.Error(w, "创建失败", http.StatusInternalServerError); return }
    // 同步到规格表
    var spec models.ProductUnitSpec
    if err := db.DB.Where("product_id = ? AND unit = ?", req.ProductID, req.Unit).First(&spec).Error; err == nil {
        spec.FactorToBase = req.FactorToBase
        spec.Kind = "purchase"
        spec.IsDefault = true
        _ = db.DB.Save(&spec).Error
    } else {
        spec = models.ProductUnitSpec{ ProductID: req.ProductID, Unit: strings.TrimSpace(req.Unit), FactorToBase: req.FactorToBase, Kind: "purchase", IsDefault: true }
        _ = db.DB.Create(&spec).Error
    }
    _ = db.DB.Model(&models.ProductUnitSpec{}).Where("product_id = ? AND id <> ?", req.ProductID, spec.ID).Update("is_default", false).Error
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(cur)
}

// DeleteProductPurchaseParam 删除采购参数（管理员）
func DeleteProductPurchaseParam(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "无权限", http.StatusForbidden); return }
    pidStr := r.URL.Query().Get("product_id")
    pid, _ := strconv.Atoi(pidStr)
    if pid <= 0 { http.Error(w, "product_id 无效", http.StatusBadRequest); return }
    if err := db.DB.Where("product_id = ?", pid).Delete(&models.ProductPurchaseParam{}).Error; err != nil { http.Error(w, "删除失败", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
}
