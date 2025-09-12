package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
)

// SupplierListResponse 供应商列表响应
type SupplierListResponse struct {
	Records []models.Supplier `json:"records"`
	Total   int64             `json:"total"`
}

// ListSupplier 获取供应商列表
func ListSupplier(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看供应商列表", http.StatusForbidden)
		return
	}

	var suppliers []models.Supplier
	query := db.DB.Model(&models.Supplier{}).Order("name")

	// 筛选参数
	if name := r.URL.Query().Get("name"); name != "" {
		query = query.Where("name LIKE ?", "%"+name+"%")
	}

	// 分页
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Supplier{}).Count(&total)
	query.Limit(limit).Offset(offset).Find(&suppliers)

	response := SupplierListResponse{
		Records: suppliers,
		Total:   total,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAllSuppliers 获取所有供应商（不分页）
func GetAllSuppliers(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看供应商列表", http.StatusForbidden)
		return
	}

	var suppliers []models.Supplier
	db.DB.Model(&models.Supplier{}).Order("name").Find(&suppliers)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(suppliers)
}

// GetSupplierDetail 获取供应商详情
func GetSupplierDetail(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看供应商详情", http.StatusForbidden)
		return
	}

	supplierID, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if supplierID == 0 {
		http.Error(w, "无效的供应商ID", http.StatusBadRequest)
		return
	}

	var supplier models.Supplier
	if err := db.DB.First(&supplier, supplierID).Error; err != nil {
		http.Error(w, "供应商不存在", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(supplier)
}

// CreateSupplierRequest 创建供应商请求
type CreateSupplierRequest struct {
	Name         string `json:"name"`
	ContactPerson string `json:"contact_person,omitempty"`
	Phone        string `json:"phone,omitempty"`
	Email        string `json:"email,omitempty"`
	Address      string `json:"address,omitempty"`
}

// CreateSupplier 创建供应商
func CreateSupplier(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权创建供应商", http.StatusForbidden)
		return
	}

	var req CreateSupplierRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "请求数据格式错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Name == "" {
		http.Error(w, "供应商名称不能为空", http.StatusBadRequest)
		return
	}

	// 检查供应商名称是否已存在
	var existingSupplier models.Supplier
	if err := db.DB.Where("name = ?", req.Name).First(&existingSupplier).Error; err == nil {
		http.Error(w, "供应商名称已存在", http.StatusBadRequest)
		return
	}

	// 创建供应商
	supplier := models.Supplier{
		Name:          req.Name,
		ContactPerson: req.ContactPerson,
		Phone:         req.Phone,
		Email:         req.Email,
		Address:       req.Address,
	}

	if err := db.DB.Create(&supplier).Error; err != nil {
		http.Error(w, "创建供应商失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(supplier)
}

// UpdateSupplierRequest 更新供应商请求
type UpdateSupplierRequest struct {
	Name         *string `json:"name,omitempty"`
	ContactPerson *string `json:"contact_person,omitempty"`
	Phone        *string `json:"phone,omitempty"`
	Email        *string `json:"email,omitempty"`
	Address      *string `json:"address,omitempty"`
}

// UpdateSupplier 更新供应商
func UpdateSupplier(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权更新供应商", http.StatusForbidden)
		return
	}

	supplierID, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if supplierID == 0 {
		http.Error(w, "无效的供应商ID", http.StatusBadRequest)
		return
	}

	var req UpdateSupplierRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "请求数据格式错误", http.StatusBadRequest)
		return
	}

	// 查找供应商
	var supplier models.Supplier
	if err := db.DB.First(&supplier, supplierID).Error; err != nil {
		http.Error(w, "供应商不存在", http.StatusNotFound)
		return
	}

	// 检查供应商名称是否已存在（如果要更新名称）
	if req.Name != nil && *req.Name != supplier.Name {
		var existingSupplier models.Supplier
		if err := db.DB.Where("name = ?", *req.Name).First(&existingSupplier).Error; err == nil {
			http.Error(w, "供应商名称已存在", http.StatusBadRequest)
			return
		}
	}

	// 更新供应商
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.ContactPerson != nil {
		updates["contact_person"] = *req.ContactPerson
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&supplier).Updates(updates).Error; err != nil {
			http.Error(w, "更新供应商失败", http.StatusInternalServerError)
			return
		}
	}

	// 重新加载更新后的供应商信息
	db.DB.First(&supplier, supplier.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(supplier)
}

// DeleteSupplier 删除供应商
func DeleteSupplier(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" {
		http.Error(w, "只有管理员可以删除供应商", http.StatusForbidden)
		return
	}

	supplierID, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if supplierID == 0 {
		http.Error(w, "无效的供应商ID", http.StatusBadRequest)
		return
	}

	// 查找供应商
	var supplier models.Supplier
	if err := db.DB.First(&supplier, supplierID).Error; err != nil {
		http.Error(w, "供应商不存在", http.StatusNotFound)
		return
	}

	// 检查是否有采购记录或应付款记录关联到此供应商
	var purchaseCount int64
	db.DB.Model(&models.PurchaseEntry{}).Where("supplier_id = ?", supplierID).Count(&purchaseCount)
	
	var payableCount int64
	db.DB.Model(&models.PayableRecord{}).Where("supplier_id = ?", supplierID).Count(&payableCount)

	if purchaseCount > 0 || payableCount > 0 {
		http.Error(w, "该供应商有关联的采购记录或应付款记录，无法删除", http.StatusBadRequest)
		return
	}

	// 删除供应商
	if err := db.DB.Delete(&supplier).Error; err != nil {
		http.Error(w, "删除供应商失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "供应商删除成功"})
}