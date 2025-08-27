package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

// CreateBaseRequest 创建基地请求结构
type CreateBaseRequest struct {
	Name        string `json:"name"`
	Code        string `json:"code"`
	Location    string `json:"location"`
	Description string `json:"description"`
}

// UpdateBaseRequest 更新基地请求结构
type UpdateBaseRequest struct {
	Name        string `json:"name"`
	Code        string `json:"code"`
	Location    string `json:"location"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

// CreateBase 创建基地
func CreateBase(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以创建基地
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限创建基地", http.StatusForbidden)
		return
	}

	var req CreateBaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Name == "" || req.Code == "" {
		http.Error(w, "基地名称和代码不能为空", http.StatusBadRequest)
		return
	}

	// 检查基地名称和代码是否已存在
	var existingBase models.Base
	if err := db.DB.Where("name = ? OR code = ?", req.Name, req.Code).First(&existingBase).Error; err == nil {
		http.Error(w, "基地名称或代码已存在", http.StatusConflict)
		return
	}

	base := models.Base{
		Name:        req.Name,
		Code:        req.Code,
		Location:    req.Location,
		Description: req.Description,
		Status:      "active",
		CreatedBy:   uint(claims["uid"].(float64)),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.DB.Create(&base).Error; err != nil {
		http.Error(w, "创建基地失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(base)
}

// ListBases 查询基地列表
func ListBases(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以查看基地列表
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限查看基地列表", http.StatusForbidden)
		return
	}

	var bases []models.Base
	query := db.DB.Order("created_at desc")

	// 支持状态筛选
	if status := r.URL.Query().Get("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// 支持名称模糊搜索
	if name := r.URL.Query().Get("name"); name != "" {
		query = query.Where("name LIKE ?", "%"+name+"%")
	}

	if err := query.Find(&bases).Error; err != nil {
		http.Error(w, "查询基地列表失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bases)
}

// GetBase 获取单个基地信息
func GetBase(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以查看基地详情
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限查看基地详情", http.StatusForbidden)
		return
	}

	baseID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "基地ID参数错误", http.StatusBadRequest)
		return
	}

	var base models.Base
	if err := db.DB.First(&base, baseID).Error; err != nil {
		http.Error(w, "基地不存在", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(base)
}

// UpdateBase 更新基地信息
func UpdateBase(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以更新基地
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限更新基地", http.StatusForbidden)
		return
	}

	baseID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "基地ID参数错误", http.StatusBadRequest)
		return
	}

	var req UpdateBaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Name == "" || req.Code == "" {
		http.Error(w, "基地名称和代码不能为空", http.StatusBadRequest)
		return
	}

	// 查找基地
	var base models.Base
	if err := db.DB.First(&base, baseID).Error; err != nil {
		http.Error(w, "基地不存在", http.StatusNotFound)
		return
	}

	// 检查名称和代码是否与其他基地冲突
	var existingBase models.Base
	if err := db.DB.Where("(name = ? OR code = ?) AND id != ?", req.Name, req.Code, baseID).First(&existingBase).Error; err == nil {
		http.Error(w, "基地名称或代码已存在", http.StatusConflict)
		return
	}

	// 更新基地信息
	base.Name = req.Name
	base.Code = req.Code
	base.Location = req.Location
	base.Description = req.Description
	if req.Status != "" {
		base.Status = req.Status
	}
	base.UpdatedAt = time.Now()

	if err := db.DB.Save(&base).Error; err != nil {
		http.Error(w, "更新基地失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(base)
}

// DeleteBase 删除基地
func DeleteBase(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以删除基地
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限删除基地", http.StatusForbidden)
		return
	}

	baseID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "基地ID参数错误", http.StatusBadRequest)
		return
	}

	// 查找基地
	var base models.Base
	if err := db.DB.First(&base, baseID).Error; err != nil {
		http.Error(w, "基地不存在", http.StatusNotFound)
		return
	}

	// 检查是否有用户关联到此基地
	var userCount int64
	if err := db.DB.Model(&models.User{}).Where("base = ?", base.Name).Count(&userCount).Error; err == nil && userCount > 0 {
		http.Error(w, "该基地下还有用户，无法删除", http.StatusConflict)
		return
	}

	// 检查是否有采购记录关联到此基地
	var purchaseCount int64
	if err := db.DB.Model(&models.PurchaseEntry{}).Where("base = ?", base.Name).Count(&purchaseCount).Error; err == nil && purchaseCount > 0 {
		http.Error(w, "该基地下还有采购记录，无法删除", http.StatusConflict)
		return
	}

	// 检查是否有费用记录关联到此基地
	var expenseCount int64
	if err := db.DB.Model(&models.BaseExpense{}).Where("base = ?", base.Name).Count(&expenseCount).Error; err == nil && expenseCount > 0 {
		http.Error(w, "该基地下还有费用记录，无法删除", http.StatusConflict)
		return
	}

	// 删除基地
	if err := db.DB.Delete(&base).Error; err != nil {
		http.Error(w, "删除基地失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "基地删除成功",
	})
}

// BatchDeleteBases 批量删除基地
type BatchDeleteBasesRequest struct {
	IDs []uint `json:"ids"`
}

func BatchDeleteBases(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以批量删除基地
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限删除基地", http.StatusForbidden)
		return
	}

	var req BatchDeleteBasesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	if len(req.IDs) == 0 {
		http.Error(w, "未选择要删除的基地", http.StatusBadRequest)
		return
	}

	// 查询要删除的基地
	var bases []models.Base
	if err := db.DB.Where("id IN ?", req.IDs).Find(&bases).Error; err != nil {
		http.Error(w, "查询基地失败", http.StatusInternalServerError)
		return
	}

	if len(bases) == 0 {
		http.Error(w, "没有找到要删除的基地", http.StatusNotFound)
		return
	}

	// 检查每个基地是否可以删除
	for _, base := range bases {
		// 检查用户关联
		var userCount int64
		if err := db.DB.Model(&models.User{}).Where("base = ?", base.Name).Count(&userCount).Error; err == nil && userCount > 0 {
			http.Error(w, "基地「"+base.Name+"」下还有用户，无法删除", http.StatusConflict)
			return
		}

		// 检查采购记录关联
		var purchaseCount int64
		if err := db.DB.Model(&models.PurchaseEntry{}).Where("base = ?", base.Name).Count(&purchaseCount).Error; err == nil && purchaseCount > 0 {
			http.Error(w, "基地「"+base.Name+"」下还有采购记录，无法删除", http.StatusConflict)
			return
		}

		// 检查费用记录关联
		var expenseCount int64
		if err := db.DB.Model(&models.BaseExpense{}).Where("base = ?", base.Name).Count(&expenseCount).Error; err == nil && expenseCount > 0 {
			http.Error(w, "基地「"+base.Name+"」下还有费用记录，无法删除", http.StatusConflict)
			return
		}
	}

	// 执行批量删除
	result := db.DB.Delete(&bases)
	if result.Error != nil {
		http.Error(w, "批量删除基地失败: "+result.Error.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"message":       "批量删除基地成功",
		"deleted_count": result.RowsAffected,
	})
}
