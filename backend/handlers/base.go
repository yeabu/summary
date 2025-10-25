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

	// 管理员：查看全部；基地代理/队长：仅查看自己关联基地
	userRole := claims["role"].(string)

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

	if userRole == "base_agent" || userRole == "captain" {
		// 过滤到当前用户的基地
		var me models.User
		if v, ok := claims["uid"]; ok {
			if f, ok2 := v.(float64); ok2 {
				db.DB.Preload("Bases").First(&me, uint(f))
			}
		}
		ids := make([]uint, 0, len(me.Bases))
		for _, b := range me.Bases {
			ids = append(ids, b.ID)
		}
		if len(ids) > 0 {
			query = query.Where("id IN ?", ids)
		} else {
			// 无基地则返回空
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]models.Base{})
			return
		}
	} else if userRole != "admin" && userRole != "warehouse_admin" {
		http.Error(w, "没有权限查看基地列表", http.StatusForbidden)
		return
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

	// 管理员可看所有；基地代理/队长仅可看自己基地
	userRole := claims["role"].(string)

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

	if userRole == "base_agent" || userRole == "captain" {
		var me models.User
		if v, ok := claims["uid"]; ok {
			if f, ok2 := v.(float64); ok2 {
				db.DB.Preload("Bases").First(&me, uint(f))
			}
		}
		allowed := map[uint]bool{}
		for _, b := range me.Bases {
			allowed[b.ID] = true
		}
		if !allowed[base.ID] {
			http.Error(w, "没有权限查看基地详情", http.StatusForbidden)
			return
		}
	} else if userRole != "admin" && userRole != "warehouse_admin" {
		http.Error(w, "没有权限查看基地详情", http.StatusForbidden)
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

	// 检查采购/费用关联（按 base_id）
	var purchaseCount int64
	if err := db.DB.Model(&models.PurchaseEntry{}).Where("base_id = ?", base.ID).Count(&purchaseCount).Error; err == nil && purchaseCount > 0 {
		http.Error(w, "该基地下还有采购记录，无法删除", http.StatusConflict)
		return
	}
	var expenseCount int64
	if err := db.DB.Model(&models.BaseExpense{}).Where("base_id = ?", base.ID).Count(&expenseCount).Error; err == nil && expenseCount > 0 {
		http.Error(w, "该基地下还有费用记录，无法删除", http.StatusConflict)
		return
	}

	// 事务内清理依赖并删除
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "事务启动失败", http.StatusInternalServerError)
		return
	}
	// 清理 user_bases 里该基地的关联
	if err := tx.Where("base_id = ?", base.ID).Delete(&models.UserBase{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "清理基地用户关联失败", http.StatusInternalServerError)
		return
	}
	// 删除基地分区，避免外键阻塞
	if err := tx.Where("base_id = ?", base.ID).Delete(&models.BaseSection{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "删除基地分区失败", http.StatusInternalServerError)
		return
	}
	// 删除基地
	if err := tx.Delete(&models.Base{}, base.ID).Error; err != nil {
		tx.Rollback()
		http.Error(w, "删除基地失败", http.StatusInternalServerError)
		return
	}
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交失败", http.StatusInternalServerError)
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

	// 检查每个基地是否可以删除（存在采购/费用则禁止）
	for _, base := range bases {
		// 检查采购记录关联
		var purchaseCount int64
		if err := db.DB.Model(&models.PurchaseEntry{}).Where("base_id = ?", base.ID).Count(&purchaseCount).Error; err == nil && purchaseCount > 0 {
			http.Error(w, "基地「"+base.Name+"」下还有采购记录，无法删除", http.StatusConflict)
			return
		}

		// 检查费用记录关联
		var expenseCount int64
		if err := db.DB.Model(&models.BaseExpense{}).Where("base_id = ?", base.ID).Count(&expenseCount).Error; err == nil && expenseCount > 0 {
			http.Error(w, "基地「"+base.Name+"」下还有费用记录，无法删除", http.StatusConflict)
			return
		}
	}

	// 执行批量删除（事务）：清理 user_bases 与 base_sections 后删除 bases
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "事务启动失败", http.StatusInternalServerError)
		return
	}
	ids := make([]uint, 0, len(bases))
	for _, b := range bases {
		ids = append(ids, b.ID)
	}
	if err := tx.Where("base_id IN ?", ids).Delete(&models.UserBase{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "清理基地用户关联失败", http.StatusInternalServerError)
		return
	}
	if err := tx.Where("base_id IN ?", ids).Delete(&models.BaseSection{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "删除基地分区失败", http.StatusInternalServerError)
		return
	}
	if err := tx.Where("id IN ?", ids).Delete(&models.Base{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "批量删除基地失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"message":       "批量删除基地成功",
		"deleted_count": len(bases),
	})
}
