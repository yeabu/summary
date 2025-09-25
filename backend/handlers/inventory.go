package handlers

import (
    "backend/db"
    "backend/middleware"
    "backend/models"
    "encoding/json"
    "net/http"
    "strconv"
    "strings"
    "time"
    "fmt"
    "io"
    "os"
    "path/filepath"
)

// InventoryRecord 返回给前端的库存记录
type InventoryRecord struct {
    ProductName string  `json:"product_name"`
    Spec        string  `json:"product_spec"`
    Unit        string  `json:"product_unit"`
    UnitPrice   float64 `json:"unit_price"`
    Currency    string  `json:"currency"`
    StockQty    float64 `json:"stock_quantity"`
    Supplier    string  `json:"supplier"`
}

// InventoryList 库存汇总（按商品）
func InventoryList(w http.ResponseWriter, r *http.Request) {
    // 权限：管理员和基地代理可查看
    if _, err := middleware.ParseJWT(r); err != nil {
        http.Error(w, "未授权", http.StatusUnauthorized)
        return
    }

    // 可选过滤：按商品名称包含查询
    keyword := strings.TrimSpace(r.URL.Query().Get("q"))

    var products []models.Product
    q := db.DB.Preload("Supplier").Order("name asc")
    if keyword != "" {
        like := "%" + keyword + "%"
        q = q.Where("name LIKE ? OR spec LIKE ?", like, like)
    }
    if err := q.Find(&products).Error; err != nil {
        http.Error(w, "查询商品失败", http.StatusInternalServerError)
        return
    }

    // 入库总量（按商品名聚合）
    type InAgg struct {
        ProductName  string  `gorm:"column:product_name"`
        QuantityBase float64 `gorm:"column:qty"`
    }
    var inAggs []InAgg
    inQ := db.DB.Table("purchase_entry_items").Select("product_name, SUM(quantity_base) as qty").Group("product_name")
    if keyword != "" {
        like := "%" + keyword + "%"
        inQ = inQ.Where("product_name LIKE ?", like)
    }
    _ = inQ.Find(&inAggs).Error
    inMap := map[string]float64{}
    for _, a := range inAggs {
        inMap[a.ProductName] = a.QuantityBase
    }

    // 出库（申领）总量（按product_id聚合）
    type OutAgg struct {
        ProductID    uint    `gorm:"column:product_id"`
        QuantityBase float64 `gorm:"column:qty"`
    }
    var outAggs []OutAgg
    outQ := db.DB.Table("material_requisitions").Select("product_id, SUM(quantity_base) as qty").Group("product_id")
    _ = outQ.Find(&outAggs).Error
    outMap := map[uint]float64{}
    for _, a := range outAggs {
        outMap[a.ProductID] = a.QuantityBase
    }

    // 组装结果
    records := make([]InventoryRecord, 0, len(products))
    for _, p := range products {
        inQty := inMap[p.Name]
        outQty := outMap[p.ID]
        stock := inQty - outQty
        if stock < 0 { stock = 0 }
        supplierName := ""
        if p.Supplier != nil { supplierName = p.Supplier.Name }
        records = append(records, InventoryRecord{
            ProductName: p.Name,
            Spec:        p.Spec,
            Unit:        p.BaseUnit,
            UnitPrice:   p.UnitPrice,
            Currency:    p.Currency,
            StockQty:    stock,
            Supplier:    supplierName,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(records)
}

type RequisitionCreateReq struct {
    BaseID      uint     `json:"base_id"`
    ProductID   uint     `json:"product_id"`
    Quantity    float64  `json:"quantity"`
    Unit        string   `json:"unit"`         // 可选，若为空则按基准单位
    UnitPrice   *float64 `json:"unit_price"`   // 可选，不传则取商品默认单价
    RequestDate string   `json:"request_date"` // yyyy-mm-dd，可选，默认今天
}

// CreateRequisition 创建物资申领记录（并校验库存充足）
func CreateRequisition(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil {
        http.Error(w, "未授权", http.StatusUnauthorized)
        return
    }

    var req RequisitionCreateReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "请求体格式错误", http.StatusBadRequest)
        return
    }
    if req.BaseID == 0 || req.ProductID == 0 || req.Quantity <= 0 {
        http.Error(w, "参数不完整", http.StatusBadRequest)
        return
    }

    // 加载商品
    var product models.Product
    if err := db.DB.First(&product, req.ProductID).Error; err != nil {
        http.Error(w, "商品不存在", http.StatusBadRequest)
        return
    }

    // 单位换算到基准单位
    quantityBase := req.Quantity
    unit := strings.TrimSpace(req.Unit)
    if unit != "" && unit != product.BaseUnit {
        // 查找单位规格换算
        var spec models.ProductUnitSpec
        if err := db.DB.Where("product_id = ? AND unit = ?", product.ID, unit).First(&spec).Error; err == nil {
            if spec.FactorToBase > 0 {
                quantityBase = req.Quantity * spec.FactorToBase
            }
        }
    }

    // 单价
    unitPrice := product.UnitPrice
    if req.UnitPrice != nil && *req.UnitPrice > 0 {
        unitPrice = *req.UnitPrice
    }

    // 计算库存 = 入库 - 出库
    var inTotal float64
    _ = db.DB.Table("purchase_entry_items").Select("SUM(quantity_base)").Where("product_name = ?", product.Name).Scan(&inTotal).Error
    var outTotal float64
    _ = db.DB.Table("material_requisitions").Select("SUM(quantity_base)").Where("product_id = ?", product.ID).Scan(&outTotal).Error
    curStock := inTotal - outTotal
    if curStock < quantityBase-1e-9 { // 允许极小浮动
        http.Error(w, "库存不足", http.StatusBadRequest)
        return
    }

    // 请求人
    var uid uint
    if v, ok := claims["uid"]; ok && v != nil {
        if f, ok2 := v.(float64); ok2 { uid = uint(f) }
    } else if v, ok := claims["user_id"]; ok && v != nil {
        if f, ok2 := v.(float64); ok2 { uid = uint(f) }
    }
    if uid == 0 {
        http.Error(w, "token缺少用户信息", http.StatusUnauthorized)
        return
    }

    // 申领日期
    var reqDate time.Time
    if strings.TrimSpace(req.RequestDate) == "" {
        reqDate = time.Now()
    } else {
        d, err := time.Parse("2006-01-02", req.RequestDate)
        if err != nil {
            http.Error(w, "request_date格式应为YYYY-MM-DD", http.StatusBadRequest)
            return
        }
        reqDate = d
    }

    rec := models.MaterialRequisition{
        BaseID:       req.BaseID,
        ProductID:    product.ID,
        ProductName:  product.Name,
        UnitPrice:    unitPrice,
        QuantityBase: quantityBase,
        TotalAmount:  unitPrice * quantityBase,
        Currency:     product.Currency,
        RequestDate:  reqDate,
        RequestedBy:  uid,
    }
    if err := db.DB.Create(&rec).Error; err != nil {
        http.Error(w, "保存申领记录失败", http.StatusInternalServerError)
        return
    }

    db.DB.Preload("Base").Preload("Product").Preload("Requester").First(&rec, rec.ID)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(rec)
}

// ListRequisition 申领记录列表
// 支持可选过滤：base_id, product_id, keyword(按商品名模糊), date_from, date_to
func ListRequisition(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil {
        http.Error(w, "未授权", http.StatusUnauthorized)
        return
    }

    q := db.DB.Preload("Base").Preload("Product").Preload("Requester").Order("request_date desc, id desc")

    if v := strings.TrimSpace(r.URL.Query().Get("base_id")); v != "" {
        if id, err := strconv.Atoi(v); err == nil {
            q = q.Where("base_id = ?", id)
        }
    }
    if v := strings.TrimSpace(r.URL.Query().Get("product_id")); v != "" {
        if id, err := strconv.Atoi(v); err == nil {
            q = q.Where("product_id = ?", id)
        }
    }
    if kw := strings.TrimSpace(r.URL.Query().Get("q")); kw != "" {
        like := "%" + kw + "%"
        q = q.Where("product_name LIKE ?", like)
    }
    if v := strings.TrimSpace(r.URL.Query().Get("date_from")); v != "" {
        if d, err := time.Parse("2006-01-02", v); err == nil {
            q = q.Where("request_date >= ?", d)
        }
    }
    if v := strings.TrimSpace(r.URL.Query().Get("date_to")); v != "" {
        if d, err := time.Parse("2006-01-02", v); err == nil {
            q = q.Where("request_date <= ?", d)
        }
    }

    var items []models.MaterialRequisition
    if err := q.Find(&items).Error; err != nil {
        http.Error(w, "查询失败", http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(items)
}

// UploadRequisitionReceipt 上传物资申领票据
func UploadRequisitionReceipt(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    r.Body = http.MaxBytesReader(w, r.Body, 20<<20)
    if err := r.ParseMultipartForm(25 << 20); err != nil { http.Error(w, "上传数据过大或格式错误", http.StatusBadRequest); return }
    file, header, err := r.FormFile("file")
    if err != nil { http.Error(w, "缺少文件", http.StatusBadRequest); return }
    defer file.Close()
    dateStr := strings.TrimSpace(r.FormValue("date"))
    if dateStr == "" { dateStr = time.Now().Format("2006-01-02") }
    if _, err := time.Parse("2006-01-02", dateStr); err != nil { http.Error(w, "date 格式应为 YYYY-MM-DD", http.StatusBadRequest); return }

    baseDir := "upload"
    if err := os.MkdirAll(baseDir, 0755); err != nil { http.Error(w, "创建上传目录失败", http.StatusInternalServerError); return }
    cleanupOldUploadDirs(baseDir, 30)
    dayDir := filepath.Join(baseDir, dateStr)
    if err := os.MkdirAll(dayDir, 0755); err != nil { http.Error(w, "创建日期目录失败", http.StatusInternalServerError); return }

    ext := filepath.Ext(header.Filename)
    if len(ext) > 10 { ext = ext[:10] }
    name := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
    dstPath := filepath.Join(dayDir, name)
    dst, err := os.Create(dstPath)
    if err != nil { http.Error(w, "保存文件失败", http.StatusInternalServerError); return }
    defer dst.Close()
    if _, err := io.Copy(dst, file); err != nil { http.Error(w, "写入文件失败", http.StatusInternalServerError); return }

    var updated *models.MaterialRequisition
    if rid := strings.TrimSpace(r.FormValue("requisition_id")); rid != "" {
        if id64, err := strconv.ParseUint(rid, 10, 64); err == nil && id64 > 0 {
            var rec models.MaterialRequisition
            if err := db.DB.First(&rec, uint(id64)).Error; err == nil {
                rel := "/" + filepath.ToSlash(filepath.Join(baseDir, dateStr, name))
                _ = db.DB.Model(&rec).Update("receipt_path", rel).Error
                updated = &rec
            }
        }
    }
    rel := "/" + filepath.ToSlash(filepath.Join(baseDir, dateStr, name))
    w.Header().Set("Content-Type", "application/json")
    if updated != nil {
        json.NewEncoder(w).Encode(map[string]any{"path": rel, "requisition": updated})
    } else {
        json.NewEncoder(w).Encode(map[string]any{"path": rel})
    }
}

// 旧目录清理逻辑统一复用 handlers 包中的 cleanupOldUploadDirs（定义于 expense.go）

// UpdateRequisition 更新物资申领记录（仅admin或本人）
func UpdateRequisition(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }

    // 允许 admin/base_agent/captain
    role, _ := claims["role"].(string)
    idStr := r.URL.Query().Get("id")
    if idStr == "" { http.Error(w, "id必填", http.StatusBadRequest); return }
    id64, _ := strconv.ParseUint(idStr, 10, 64)

    var rec models.MaterialRequisition
    if err := db.DB.First(&rec, uint(id64)).Error; err != nil { http.Error(w, "记录不存在", http.StatusNotFound); return }

    // 权限：admin任意；base_agent/captain 只能编辑本人创建
    var uid uint
    if v, ok := claims["uid"]; ok { if f, ok2 := v.(float64); ok2 { uid = uint(f) } }
    if !(role == "admin" || rec.RequestedBy == uid) { http.Error(w, "无权限", http.StatusForbidden); return }

    var req RequisitionCreateReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "请求体格式错误", http.StatusBadRequest); return }
    if req.BaseID == 0 || req.ProductID == 0 || req.Quantity <= 0 { http.Error(w, "参数不完整", http.StatusBadRequest); return }

    var product models.Product
    if err := db.DB.First(&product, req.ProductID).Error; err != nil { http.Error(w, "商品不存在", http.StatusBadRequest); return }

    // 单位换算到基准单位
    newQtyBase := req.Quantity
    unit := strings.TrimSpace(req.Unit)
    if unit != "" && unit != product.BaseUnit {
        var spec models.ProductUnitSpec
        if err := db.DB.Where("product_id = ? AND unit = ?", product.ID, unit).First(&spec).Error; err == nil && spec.FactorToBase > 0 {
            newQtyBase = req.Quantity * spec.FactorToBase
        }
    }

    // 计算可用库存 = 入库 - (出库 - 当前记录旧值)
    var inTotal float64
    _ = db.DB.Table("purchase_entry_items").Select("SUM(quantity_base)").Where("product_name = ?", product.Name).Scan(&inTotal).Error
    var outTotal float64
    _ = db.DB.Table("material_requisitions").Select("SUM(quantity_base)").Where("product_id = ?", product.ID).Scan(&outTotal).Error
    available := inTotal - (outTotal - rec.QuantityBase)
    if available < newQtyBase-1e-9 { http.Error(w, "库存不足", http.StatusBadRequest); return }

    // 单价
    newUnitPrice := product.UnitPrice
    if req.UnitPrice != nil && *req.UnitPrice > 0 { newUnitPrice = *req.UnitPrice }

    // 日期
    var reqDate time.Time
    if strings.TrimSpace(req.RequestDate) == "" { reqDate = time.Now() } else {
        d, err := time.Parse("2006-01-02", req.RequestDate); if err != nil { http.Error(w, "request_date格式错误", http.StatusBadRequest); return }
        reqDate = d
    }

    rec.BaseID = req.BaseID
    rec.ProductID = product.ID
    rec.ProductName = product.Name
    rec.UnitPrice = newUnitPrice
    rec.QuantityBase = newQtyBase
    rec.TotalAmount = newUnitPrice * newQtyBase
    rec.Currency = product.Currency
    rec.RequestDate = reqDate
    if err := db.DB.Save(&rec).Error; err != nil { http.Error(w, "更新失败", http.StatusInternalServerError); return }

    db.DB.Preload("Base").Preload("Product").Preload("Requester").First(&rec, rec.ID)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(rec)
}

// DeleteRequisition 删除物资申领记录（仅admin或本人）
func DeleteRequisition(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    role, _ := claims["role"].(string)
    idStr := r.URL.Query().Get("id")
    if idStr == "" { http.Error(w, "id必填", http.StatusBadRequest); return }
    id64, _ := strconv.ParseUint(idStr, 10, 64)

    var rec models.MaterialRequisition
    if err := db.DB.First(&rec, uint(id64)).Error; err != nil { http.Error(w, "记录不存在", http.StatusNotFound); return }

    var uid uint
    if v, ok := claims["uid"]; ok { if f, ok2 := v.(float64); ok2 { uid = uint(f) } }
    if !(role == "admin" || rec.RequestedBy == uid) { http.Error(w, "无权限", http.StatusForbidden); return }

    if err := db.DB.Delete(&rec).Error; err != nil { http.Error(w, "删除失败", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]any{"success": true})
}
