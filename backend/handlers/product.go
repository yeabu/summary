package handlers

import (
    "backend/db"
    "backend/middleware"
    "backend/models"
    "encoding/csv"
    "encoding/json"
    "io"
    "mime/multipart"
    "net/http"
    "strconv"
    "strings"
    "time"
)

type productCreateReq struct {
    Name       string   `json:"name"`
    BaseUnit   string   `json:"base_unit"`
    Spec       string   `json:"spec"`
    UnitPrice  float64  `json:"unit_price"`
    SupplierID *uint    `json:"supplier_id,omitempty"`
    Status     string   `json:"status"`
}

type productUpdateReq struct {
    Name       *string  `json:"name,omitempty"`
    BaseUnit   *string  `json:"base_unit,omitempty"`
    Spec       *string  `json:"spec,omitempty"`
    UnitPrice  *float64 `json:"unit_price,omitempty"`
    SupplierID *uint    `json:"supplier_id,omitempty"`
    Status     *string  `json:"status,omitempty"`
}

// ListProduct 商品列表，支持按名称和供应商筛选，返回分页和总数
func ListProduct(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    name := strings.TrimSpace(r.URL.Query().Get("name"))
    supplierIDStr := strings.TrimSpace(r.URL.Query().Get("supplier_id"))
    limitStr := r.URL.Query().Get("limit")
    offsetStr := r.URL.Query().Get("offset")
    limit, _ := strconv.Atoi(limitStr); if limit <= 0 { limit = 50 }
    offset, _ := strconv.Atoi(offsetStr)

    baseQ := db.DB.Model(&models.Product{})
    if name != "" { baseQ = baseQ.Where("name LIKE ?", "%"+name+"%") }
    if supplierIDStr != "" {
        if sid, err := strconv.Atoi(supplierIDStr); err == nil && sid > 0 {
            baseQ = baseQ.Where("supplier_id = ?", sid)
        }
    }
    var total int64
    if err := baseQ.Count(&total).Error; err != nil {
        http.Error(w, "统计总数失败", http.StatusInternalServerError); return
    }
    var items []models.Product
    if err := baseQ.Preload("Supplier").Order("id desc").Limit(limit).Offset(offset).Find(&items).Error; err != nil {
        http.Error(w, "查询失败", http.StatusInternalServerError); return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]any{
        "records": items,
        "total": total,
    })
}

// CreateProduct 新建商品
func CreateProduct(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "无权限", http.StatusForbidden); return }
    var req productCreateReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "参数错误", http.StatusBadRequest); return }
    if strings.TrimSpace(req.Name) == "" { http.Error(w, "商品名称必填", http.StatusBadRequest); return }
    p := models.Product{
        Name:       strings.TrimSpace(req.Name),
        BaseUnit:   strings.TrimSpace(req.BaseUnit),
        Spec:       strings.TrimSpace(req.Spec),
        UnitPrice:  req.UnitPrice,
        SupplierID: req.SupplierID,
        Status:     "active",
        CreatedAt:  time.Now(),
        UpdatedAt:  time.Now(),
    }
    if req.Status != "" { p.Status = req.Status }
    if err := db.DB.Create(&p).Error; err != nil { http.Error(w, "创建失败"+": "+err.Error(), http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(p)
}

// UpdateProduct 更新商品
func UpdateProduct(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "无权限", http.StatusForbidden); return }
    idStr := r.URL.Query().Get("id"); id, _ := strconv.Atoi(idStr)
    if id <= 0 { http.Error(w, "无效ID", http.StatusBadRequest); return }
    var req productUpdateReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "参数错误", http.StatusBadRequest); return }
    var p models.Product
    if err := db.DB.First(&p, id).Error; err != nil { http.Error(w, "未找到商品", http.StatusNotFound); return }
    if req.Name != nil { p.Name = strings.TrimSpace(*req.Name) }
    if req.BaseUnit != nil { p.BaseUnit = strings.TrimSpace(*req.BaseUnit) }
    if req.Spec != nil { p.Spec = strings.TrimSpace(*req.Spec) }
    if req.UnitPrice != nil { p.UnitPrice = *req.UnitPrice }
    if req.SupplierID != nil { p.SupplierID = req.SupplierID }
    if req.Status != nil && *req.Status != "" { p.Status = *req.Status }
    p.UpdatedAt = time.Now()
    if err := db.DB.Save(&p).Error; err != nil { http.Error(w, "更新失败", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(p)
}

// DeleteProduct 删除商品
func DeleteProduct(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "无权限", http.StatusForbidden); return }
    idStr := r.URL.Query().Get("id"); id, _ := strconv.Atoi(idStr)
    if id <= 0 { http.Error(w, "无效ID", http.StatusBadRequest); return }
    if err := db.DB.Delete(&models.Product{}, id).Error; err != nil { http.Error(w, "删除失败", http.StatusInternalServerError); return }
    w.Header().Set("Content-Type", "application/json"); json.NewEncoder(w).Encode(map[string]string{"message":"ok"})
}

// ExportProductCSV 导出商品列表为CSV
func ExportProductCSV(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    name := strings.TrimSpace(r.URL.Query().Get("name"))
    supplierIDStr := strings.TrimSpace(r.URL.Query().Get("supplier_id"))

    q := db.DB.Model(&models.Product{})
    if name != "" { q = q.Where("name LIKE ?", "%"+name+"%") }
    if supplierIDStr != "" {
        if sid, err := strconv.Atoi(supplierIDStr); err == nil && sid > 0 { q = q.Where("supplier_id = ?", sid) }
    }
    var items []models.Product
    if err := q.Preload("Supplier").Order("id desc").Find(&items).Error; err != nil {
        http.Error(w, "导出失败", http.StatusInternalServerError); return
    }
    w.Header().Set("Content-Type", "text/csv; charset=utf-8")
    w.Header().Set("Content-Disposition", "attachment; filename=products.csv")
    cw := csv.NewWriter(w)
    _ = cw.Write([]string{"id","name","spec","base_unit","unit_price","supplier","status"})
    for _, p := range items {
        supName := ""
        if p.Supplier != nil { supName = p.Supplier.Name }
        _ = cw.Write([]string{
            strconv.FormatUint(uint64(p.ID), 10),
            p.Name,
            p.Spec,
            p.BaseUnit,
            strconv.FormatFloat(p.UnitPrice, 'f', 2, 64),
            supName,
            p.Status,
        })
    }
    cw.Flush()
}

// DownloadProductCSVTemplate 返回商品导入CSV模板
func DownloadProductCSVTemplate(w http.ResponseWriter, r *http.Request) {
    if _, err := middleware.ParseJWT(r); err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    w.Header().Set("Content-Type", "text/csv; charset=utf-8")
    w.Header().Set("Content-Disposition", "attachment; filename=product_import_template.csv")
    w.Write([]byte("name,spec,base_unit,unit_price,supplier_name\n"))
    w.Write([]byte("矿泉水,500ml,瓶,2.50,农夫山泉\n"))
}

// ImportProductCSV CSV导入商品（支持supplier_id或supplier_name）
func ImportProductCSV(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r); if err != nil { http.Error(w, "未授权", http.StatusUnauthorized); return }
    if role, _ := claims["role"].(string); role != "admin" { http.Error(w, "无权限", http.StatusForbidden); return }
    if err := r.ParseMultipartForm(10 << 20); err != nil { http.Error(w, "解析上传失败", http.StatusBadRequest); return }
    file, _, err := r.FormFile("file")
    if err != nil { http.Error(w, "未找到文件", http.StatusBadRequest); return }
    defer file.Close()
    reader := csv.NewReader(file)
    reader.FieldsPerRecord = -1
    // 读取表头
    header, err := reader.Read()
    if err != nil { http.Error(w, "读取表头失败", http.StatusBadRequest); return }
    // 构造列索引
    idx := make(map[string]int)
    for i, h := range header {
        idx[strings.ToLower(strings.TrimSpace(h))] = i
    }
    // 支持列：name,spec,base_unit,unit_price,supplier_id,supplier_name
    created := 0
    updated := 0
    for {
        rec, err := reader.Read()
        if err == io.EOF { break }
        if err != nil { http.Error(w, "读取CSV失败", http.StatusBadRequest); return }
        get := func(key string) string {
            if p, ok := idx[key]; ok && p < len(rec) { return strings.TrimSpace(rec[p]) }
            return ""
        }
        name := get("name")
        if name == "" { continue }
        spec := get("spec")
        baseUnit := get("base_unit")
        unitPriceStr := get("unit_price")
        var unitPrice float64
        if unitPriceStr != "" { if v, e := strconv.ParseFloat(unitPriceStr, 64); e == nil { unitPrice = v } }
        // 供应商解析
        var supplierID *uint
        if sidStr := get("supplier_id"); sidStr != "" {
            if v, e := strconv.Atoi(sidStr); e == nil && v > 0 { vv := uint(v); supplierID = &vv }
        } else if sname := get("supplier_name"); sname != "" {
            var sup models.Supplier
            if err := db.DB.Where("name = ?", sname).First(&sup).Error; err != nil {
                // 若不存在则创建
                sup = models.Supplier{Name: sname, CreatedAt: time.Now(), UpdatedAt: time.Now()}
                _ = db.DB.Create(&sup).Error
            }
            supplierID = &sup.ID
        }
        // upsert by name
        var p models.Product
        if err := db.DB.Where("name = ?", name).First(&p).Error; err == nil {
            if spec != "" { p.Spec = spec }
            if baseUnit != "" { p.BaseUnit = baseUnit }
            if unitPrice > 0 { p.UnitPrice = unitPrice }
            if supplierID != nil { p.SupplierID = supplierID }
            p.UpdatedAt = time.Now()
            _ = db.DB.Save(&p).Error
            updated++
        } else {
            p = models.Product{
                Name: name,
                BaseUnit: baseUnit,
                Spec: spec,
                UnitPrice: unitPrice,
                SupplierID: supplierID,
                Status: "active",
                CreatedAt: time.Now(),
                UpdatedAt: time.Now(),
            }
            _ = db.DB.Create(&p).Error
            created++
        }
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]int{"created": created, "updated": updated})
}

// helper for tests: accept file via direct body when multipart not used
func readFileFromMultipart(fh *multipart.FileHeader) ([]byte, error) { return nil, nil }
