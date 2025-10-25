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

type expenseCategoryReq struct {
	Name   string  `json:"name"`
	Code   *string `json:"code"`
	Status string  `json:"status"`
}

func normalizeCode(codePtr *string) *string {
	if codePtr == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*codePtr)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

// 创建费用类别
func CreateExpenseCategory(w http.ResponseWriter, r *http.Request) {
	// 验证管理员权限
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" {
		http.Error(w, "无权创建费用类别", http.StatusForbidden)
		return
	}

	var payload expenseCategoryReq
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	name := strings.TrimSpace(payload.Name)
	if name == "" {
		http.Error(w, "类别名称不能为空", http.StatusBadRequest)
		return
	}

	// 检查是否已存在同名类别
	var existingCategory models.ExpenseCategory
	if err := db.DB.Where("name = ?", name).First(&existingCategory).Error; err == nil {
		http.Error(w, "已存在同名的费用类别", http.StatusBadRequest)
		return
	}

	// 设置默认状态
	status := strings.TrimSpace(payload.Status)
	if status == "" {
		status = "active"
	}

	category := models.ExpenseCategory{
		Name:   name,
		Status: status,
	}
	if code := normalizeCode(payload.Code); code != nil {
		category.Code = code
	}

	// 创建费用类别
	if err := db.DB.Create(&category).Error; err != nil {
		http.Error(w, "创建费用类别失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(category)
}

// 获取费用类别列表
func ListExpenseCategory(w http.ResponseWriter, r *http.Request) {
	// 验证用户权限（所有登录用户都可以查看）
	_, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	var categories []models.ExpenseCategory
	status := r.URL.Query().Get("status")

	query := db.DB.Order("name")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&categories).Error; err != nil {
		http.Error(w, "获取费用类别列表失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

// 获取费用类别详情
func GetExpenseCategory(w http.ResponseWriter, r *http.Request) {
	// 验证用户权限（所有登录用户都可以查看）
	_, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	id, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil || id == 0 {
		http.Error(w, "无效的费用类别ID", http.StatusBadRequest)
		return
	}

	var category models.ExpenseCategory
	if err := db.DB.First(&category, id).Error; err != nil {
		http.Error(w, "费用类别不存在", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(category)
}

// 更新费用类别
func UpdateExpenseCategory(w http.ResponseWriter, r *http.Request) {
	// 验证管理员权限
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" {
		http.Error(w, "无权更新费用类别", http.StatusForbidden)
		return
	}

	id, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil || id == 0 {
		http.Error(w, "无效的费用类别ID", http.StatusBadRequest)
		return
	}

	var category models.ExpenseCategory
	if err := db.DB.First(&category, id).Error; err != nil {
		http.Error(w, "费用类别不存在", http.StatusNotFound)
		return
	}

	var payload expenseCategoryReq
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 检查名称唯一性（如果名称被修改）
	if strings.TrimSpace(payload.Name) != "" && strings.TrimSpace(payload.Name) != category.Name {
		var existingCategory models.ExpenseCategory
		if err := db.DB.Where("name = ? AND id != ?", strings.TrimSpace(payload.Name), id).First(&existingCategory).Error; err == nil {
			http.Error(w, "已存在同名的费用类别", http.StatusBadRequest)
			return
		}
	}

	// 更新字段
	if strings.TrimSpace(payload.Name) != "" {
		category.Name = strings.TrimSpace(payload.Name)
	}
	if payload.Code != nil {
		category.Code = normalizeCode(payload.Code)
	}
	if strings.TrimSpace(payload.Status) != "" {
		category.Status = strings.TrimSpace(payload.Status)
	}

	if err := db.DB.Save(&category).Error; err != nil {
		http.Error(w, "更新费用类别失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(category)
}

// 删除费用类别
func DeleteExpenseCategory(w http.ResponseWriter, r *http.Request) {
	// 验证管理员权限
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" {
		http.Error(w, "无权删除费用类别", http.StatusForbidden)
		return
	}

	id, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil || id == 0 {
		http.Error(w, "无效的费用类别ID", http.StatusBadRequest)
		return
	}

	var category models.ExpenseCategory
	if err := db.DB.First(&category, id).Error; err != nil {
		http.Error(w, "费用类别不存在", http.StatusNotFound)
		return
	}

	// 检查是否有关联的开支记录
	var count int64
	db.DB.Model(&models.BaseExpense{}).Where("category_id = ?", id).Count(&count)
	if count > 0 {
		http.Error(w, "该费用类别已被使用，无法删除", http.StatusBadRequest)
		return
	}

	// 删除费用类别
	if err := db.DB.Delete(&category).Error; err != nil {
		http.Error(w, "删除费用类别失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "删除成功",
	})
}
