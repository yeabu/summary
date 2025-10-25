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
	Name       string  `json:"name"`
	BaseUnit   string  `json:"base_unit"`
	Spec       string  `json:"spec"`
	UnitPrice  float64 `json:"unit_price"`
	Currency   string  `json:"currency"`
	SupplierID *uint   `json:"supplier_id,omitempty"`
	Status     string  `json:"status"`
}

type productUpdateReq struct {
	Name       *string  `json:"name,omitempty"`
	BaseUnit   *string  `json:"base_unit,omitempty"`
	Spec       *string  `json:"spec,omitempty"`
	UnitPrice  *float64 `json:"unit_price,omitempty"`
	Currency   *string  `json:"currency,omitempty"`
	SupplierID *uint    `json:"supplier_id,omitempty"`
	Status     *string  `json:"status,omitempty"`
}

// ListProduct 商品列表，支持按名称和供应商筛选，返回分页和总数
func ListProduct(w http.ResponseWriter, r *http.Request) {
	if _, err := middleware.ParseJWT(r); err != nil {
		http.Error(w, "未授权", http.StatusUnauthorized)
		return
	}
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	supplierIDStr := strings.TrimSpace(r.URL.Query().Get("supplier_id"))
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 50
	}
	offset, _ := strconv.Atoi(offsetStr)

	baseQ := db.DB.Model(&models.Product{})
	if name != "" {
		baseQ = baseQ.Where("name LIKE ?", "%"+name+"%")
	}
	if supplierIDStr != "" {
		if sid, err := strconv.Atoi(supplierIDStr); err == nil && sid > 0 {
			baseQ = baseQ.Where("supplier_id = ?", sid)
		}
	}
	var total int64
	if err := baseQ.Count(&total).Error; err != nil {
		http.Error(w, "统计总数失败", http.StatusInternalServerError)
		return
	}
	var items []models.Product
	if err := baseQ.Preload("Supplier").Order("id desc").Limit(limit).Offset(offset).Find(&items).Error; err != nil {
		http.Error(w, "查询失败", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"records": items,
		"total":   total,
	})
}

// CreateProduct 新建商品
func CreateProduct(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "未授权", http.StatusUnauthorized)
		return
	}
	if role, _ := claims["role"].(string); role != "admin" && role != "warehouse_admin" {
		http.Error(w, "无权限", http.StatusForbidden)
		return
	}
	var req productCreateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		http.Error(w, "商品名称必填", http.StatusBadRequest)
		return
	}
	p := models.Product{
		Name:      strings.TrimSpace(req.Name),
		BaseUnit:  strings.TrimSpace(req.BaseUnit),
		Spec:      strings.TrimSpace(req.Spec),
		UnitPrice: req.UnitPrice,
		Currency: func() string {
			if strings.TrimSpace(req.Currency) != "" {
				return strings.ToUpper(strings.TrimSpace(req.Currency))
			}
			return "CNY"
		}(),
		SupplierID: req.SupplierID,
		Status:     "active",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	if req.Status != "" {
		p.Status = req.Status
	}
	if err := db.DB.Create(&p).Error; err != nil {
		http.Error(w, "创建失败"+": "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// UpdateProduct 更新商品
func UpdateProduct(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "未授权", http.StatusUnauthorized)
		return
	}
	if role, _ := claims["role"].(string); role != "admin" && role != "warehouse_admin" {
		http.Error(w, "无权限", http.StatusForbidden)
		return
	}
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)
	if id <= 0 {
		http.Error(w, "无效ID", http.StatusBadRequest)
		return
	}
	var req productUpdateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}
	var p models.Product
	if err := db.DB.First(&p, id).Error; err != nil {
		http.Error(w, "未找到商品", http.StatusNotFound)
		return
	}
	if req.Name != nil {
		p.Name = strings.TrimSpace(*req.Name)
	}
	if req.BaseUnit != nil {
		p.BaseUnit = strings.TrimSpace(*req.BaseUnit)
	}
	if req.Spec != nil {
		p.Spec = strings.TrimSpace(*req.Spec)
	}
	if req.UnitPrice != nil {
		p.UnitPrice = *req.UnitPrice
	}
	if req.Currency != nil && strings.TrimSpace(*req.Currency) != "" {
		p.Currency = strings.ToUpper(strings.TrimSpace(*req.Currency))
	}
	if req.SupplierID != nil {
		p.SupplierID = req.SupplierID
	}
	if req.Status != nil && *req.Status != "" {
		p.Status = *req.Status
	}
	p.UpdatedAt = time.Now()
	if err := db.DB.Save(&p).Error; err != nil {
		http.Error(w, "更新失败", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

// DeleteProduct 删除商品
func DeleteProduct(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "未授权", http.StatusUnauthorized)
		return
	}
	if role, _ := claims["role"].(string); role != "admin" && role != "warehouse_admin" {
		http.Error(w, "无权限", http.StatusForbidden)
		return
	}
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.Atoi(idStr)
	if id <= 0 {
		http.Error(w, "无效ID", http.StatusBadRequest)
		return
	}
	// 先检查是否被物资申领引用
	var mrCount int64
	if err := db.DB.Model(&models.MaterialRequisition{}).Where("product_id = ?", id).Count(&mrCount).Error; err == nil && mrCount > 0 {
		http.Error(w, "该商品存在物资申领记录，无法删除", http.StatusConflict)
		return
	}
	// 清理关联的单位规格与采购参数，避免外键阻塞
	if err := db.DB.Where("product_id = ?", id).Delete(&models.ProductUnitSpec{}).Error; err != nil {
		http.Error(w, "清理商品单位规格失败", http.StatusInternalServerError)
		return
	}
	if err := db.DB.Where("product_id = ?", id).Delete(&models.ProductPurchaseParam{}).Error; err != nil {
		http.Error(w, "清理商品采购参数失败", http.StatusInternalServerError)
		return
	}
	// 删除商品
	if err := db.DB.Delete(&models.Product{}, id).Error; err != nil {
		http.Error(w, "删除失败", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
}

// ExportProductCSV 导出商品列表为CSV
func ExportProductCSV(w http.ResponseWriter, r *http.Request) {
	if _, err := middleware.ParseJWT(r); err != nil {
		http.Error(w, "未授权", http.StatusUnauthorized)
		return
	}
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	supplierIDStr := strings.TrimSpace(r.URL.Query().Get("supplier_id"))

	q := db.DB.Model(&models.Product{})
	if name != "" {
		q = q.Where("name LIKE ?", "%"+name+"%")
	}
	if supplierIDStr != "" {
		if sid, err := strconv.Atoi(supplierIDStr); err == nil && sid > 0 {
			q = q.Where("supplier_id = ?", sid)
		}
	}
	var items []models.Product
	if err := q.Preload("Supplier").Order("id desc").Find(&items).Error; err != nil {
		http.Error(w, "导出失败", http.StatusInternalServerError)
		return
	}
	ids := make([]uint, 0, len(items))
	for _, p := range items {
		ids = append(ids, p.ID)
	}
	ppMap := map[uint]models.ProductPurchaseParam{}
	if len(ids) > 0 {
		var params []models.ProductPurchaseParam
		if err := db.DB.Where("product_id IN ?", ids).Find(&params).Error; err == nil {
			for _, pp := range params {
				ppMap[pp.ProductID] = pp
			}
		}
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=products.csv")
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"id", "name", "spec", "base_unit", "unit_price", "currency", "supplier_id", "supplier_name", "status", "purchase_unit", "purchase_factor", "purchase_price"})
	for _, p := range items {
		supName := ""
		if p.Supplier != nil {
			supName = p.Supplier.Name
		}
		supID := ""
		if p.SupplierID != nil {
			supID = strconv.FormatUint(uint64(*p.SupplierID), 10)
		}
		var purchaseUnit, purchaseFactor, purchasePrice string
		if pp, ok := ppMap[p.ID]; ok {
			purchaseUnit = pp.Unit
			purchaseFactor = strconv.FormatFloat(pp.FactorToBase, 'f', 4, 64)
			purchasePrice = strconv.FormatFloat(pp.PurchasePrice, 'f', 2, 64)
		}
		_ = cw.Write([]string{
			strconv.FormatUint(uint64(p.ID), 10),
			p.Name,
			p.Spec,
			p.BaseUnit,
			strconv.FormatFloat(p.UnitPrice, 'f', 2, 64),
			p.Currency,
			supID,
			supName,
			p.Status,
			purchaseUnit,
			purchaseFactor,
			purchasePrice,
		})
	}
	cw.Flush()
}

// DownloadProductCSVTemplate 返回商品导入CSV模板
func DownloadProductCSVTemplate(w http.ResponseWriter, r *http.Request) {
	if _, err := middleware.ParseJWT(r); err != nil {
		http.Error(w, "未授权", http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=product_import_template.csv")
	w.Write([]byte("name,spec,base_unit,unit_price,currency,supplier_id,supplier_name,purchase_unit,purchase_factor,purchase_price\n"))
	w.Write([]byte("矿泉水,500ml,瓶,2.50,CNY,,农夫山泉,箱,12,28.80\n"))
}

// ImportProductCSV CSV导入商品（支持supplier_id或supplier_name）
func ImportProductCSV(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "未授权", http.StatusUnauthorized)
		return
	}
	if role, _ := claims["role"].(string); role != "admin" && role != "warehouse_admin" {
		http.Error(w, "无权限", http.StatusForbidden)
		return
	}
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "解析上传失败", http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "未找到文件", http.StatusBadRequest)
		return
	}
	defer file.Close()
	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	// 读取表头
	header, err := reader.Read()
	if err != nil {
		http.Error(w, "读取表头失败", http.StatusBadRequest)
		return
	}
	// 构造列索引
	idx := make(map[string]int)
	for i, h := range header {
		idx[strings.ToLower(strings.TrimSpace(h))] = i
	}
	// 支持列：name,spec,base_unit,unit_price,currency,supplier_id,supplier_name,purchase_unit,purchase_factor,purchase_price
	created := 0
	updated := 0
	for {
		rec, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			http.Error(w, "读取CSV失败", http.StatusBadRequest)
			return
		}
		get := func(key string) string {
			if p, ok := idx[key]; ok && p < len(rec) {
				return strings.TrimSpace(rec[p])
			}
			return ""
		}
		name := get("name")
		if name == "" {
			continue
		}
		spec := get("spec")
		baseUnit := get("base_unit")
		unitPriceStr := get("unit_price")
		currency := strings.ToUpper(strings.TrimSpace(get("currency")))
		var unitPrice float64
		if unitPriceStr != "" {
			if v, e := strconv.ParseFloat(unitPriceStr, 64); e == nil {
				unitPrice = v
			}
		}
		purchaseUnit := get("purchase_unit")
		purchaseFactorStr := get("purchase_factor")
		purchasePriceStr := get("purchase_price")
		var purchaseFactor float64
		if purchaseFactorStr != "" {
			if v, e := strconv.ParseFloat(purchaseFactorStr, 64); e == nil {
				purchaseFactor = v
			}
		}
		var purchasePrice float64
		if purchasePriceStr != "" {
			if v, e := strconv.ParseFloat(purchasePriceStr, 64); e == nil {
				purchasePrice = v
			}
		}
		// 供应商解析
		var supplierID *uint
		if sidStr := get("supplier_id"); sidStr != "" {
			if v, e := strconv.Atoi(sidStr); e == nil && v > 0 {
				vv := uint(v)
				supplierID = &vv
			}
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
			if spec != "" {
				p.Spec = spec
			}
			if baseUnit != "" {
				p.BaseUnit = baseUnit
			}
			if unitPrice > 0 {
				p.UnitPrice = unitPrice
			}
			if supplierID != nil {
				p.SupplierID = supplierID
			}
			if currency != "" {
				p.Currency = currency
			}
			p.UpdatedAt = time.Now()
			_ = db.DB.Save(&p).Error
			updated++
		} else {
			p = models.Product{
				Name:      name,
				BaseUnit:  baseUnit,
				Spec:      spec,
				UnitPrice: unitPrice,
				Currency: func() string {
					if currency != "" {
						return currency
					}
					return "CNY"
				}(),
				SupplierID: supplierID,
				Status:     "active",
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			}
			_ = db.DB.Create(&p).Error
			created++
		}
		if purchaseUnit != "" && purchaseFactor > 0 && purchasePrice > 0 {
			_ = upsertPurchaseParamForProduct(p.ID, purchaseUnit, purchaseFactor, purchasePrice)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"created": created, "updated": updated})
}

// helper for tests: accept file via direct body when multipart not used
func readFileFromMultipart(fh *multipart.FileHeader) ([]byte, error) { return nil, nil }

// upsertPurchaseParamForProduct 在导入过程中同步采购参数与单位规格
func upsertPurchaseParamForProduct(productID uint, unit string, factor float64, price float64) error {
	unit = strings.TrimSpace(unit)
	if productID == 0 || unit == "" || factor <= 0 || price <= 0 {
		return nil
	}
	var cur models.ProductPurchaseParam
	if err := db.DB.Where("product_id = ?", productID).First(&cur).Error; err == nil {
		cur.Unit = unit
		cur.FactorToBase = factor
		cur.PurchasePrice = price
		var prodCurrency string
		if err := db.DB.Model(&models.Product{}).Where("id = ?", productID).Pluck("currency", &prodCurrency).Error; err == nil && strings.TrimSpace(prodCurrency) != "" {
			cur.Currency = strings.ToUpper(strings.TrimSpace(prodCurrency))
		} else if strings.TrimSpace(cur.Currency) == "" {
			cur.Currency = "CNY"
		}
		if err := db.DB.Save(&cur).Error; err != nil {
			return err
		}
		return syncUnitSpecForPurchase(productID, unit, factor)
	}
	// 初次创建时从商品继承币种
	var prodCurrency string
	_ = db.DB.Model(&models.Product{}).Where("id = ?", productID).Pluck("currency", &prodCurrency).Error
	currency := strings.ToUpper(strings.TrimSpace(prodCurrency))
	if currency == "" {
		currency = "CNY"
	}
	cur = models.ProductPurchaseParam{ProductID: productID, Unit: unit, FactorToBase: factor, PurchasePrice: price, Currency: currency}
	if err := db.DB.Create(&cur).Error; err != nil {
		return err
	}
	return syncUnitSpecForPurchase(productID, unit, factor)
}

// syncUnitSpecForPurchase 确保采购参数对应的单位规格存在并为默认
func syncUnitSpecForPurchase(productID uint, unit string, factor float64) error {
	var spec models.ProductUnitSpec
	if err := db.DB.Where("product_id = ? AND unit = ?", productID, unit).First(&spec).Error; err == nil {
		spec.FactorToBase = factor
		spec.Kind = "purchase"
		spec.IsDefault = true
		if err := db.DB.Save(&spec).Error; err != nil {
			return err
		}
		_ = db.DB.Model(&models.ProductUnitSpec{}).Where("product_id = ? AND id <> ?", productID, spec.ID).Update("is_default", false).Error
		return nil
	}
	spec = models.ProductUnitSpec{ProductID: productID, Unit: unit, FactorToBase: factor, Kind: "purchase", IsDefault: true}
	if err := db.DB.Create(&spec).Error; err != nil {
		return err
	}
	_ = db.DB.Model(&models.ProductUnitSpec{}).Where("product_id = ? AND id <> ?", productID, spec.ID).Update("is_default", false).Error
	return nil
}
