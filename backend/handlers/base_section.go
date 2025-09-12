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

// CreateBaseSectionRequest 创建基地分区请求结构
type CreateBaseSectionRequest struct {
	Name        string `json:"name"`
	BaseID      uint   `json:"base_id"`
	LeaderID    *uint  `json:"leader_id"`
	Description string `json:"description"`
}

// UpdateBaseSectionRequest 更新基地分区请求结构
type UpdateBaseSectionRequest struct {
	Name        string `json:"name"`
	BaseID      uint   `json:"base_id"`
	LeaderID    *uint  `json:"leader_id"`
	Description string `json:"description"`
}

// BaseSectionResponse 基地分区响应结构
type BaseSectionResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	BaseID      uint   `json:"base_id"`
	BaseName    string `json:"base_name"`
	LeaderID    *uint  `json:"leader_id"`
	LeaderName  string `json:"leader_name"`
	Description string `json:"description"`
	CreatedBy   uint   `json:"created_by"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// CreateBaseSection 创建基地分区
func CreateBaseSection(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以创建基地分区
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限创建基地分区", http.StatusForbidden)
		return
	}

	var req CreateBaseSectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Name == "" || req.BaseID == 0 {
		http.Error(w, "分区名称和所属基地不能为空", http.StatusBadRequest)
		return
	}

	// 检查基地是否存在
	var base models.Base
	if err := db.DB.First(&base, req.BaseID).Error; err != nil {
		http.Error(w, "指定的基地不存在", http.StatusNotFound)
		return
	}

	// 如果指定了队长，检查队长是否存在且角色为队长
	if req.LeaderID != nil {
		var leader models.User
		if err := db.DB.First(&leader, req.LeaderID).Error; err != nil {
			http.Error(w, "指定的队长用户不存在", http.StatusNotFound)
			return
		}
		if leader.Role != "captain" {
			http.Error(w, "指定的用户不是队长角色", http.StatusBadRequest)
			return
		}
	}

	section := models.BaseSection{
		Name:        req.Name,
		BaseID:      req.BaseID,
		LeaderID:    req.LeaderID,
		Description: req.Description,
		CreatedBy:   uint(claims["uid"].(float64)),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.DB.Create(&section).Error; err != nil {
		http.Error(w, "创建基地分区失败", http.StatusInternalServerError)
		return
	}

	// 构建响应
	response := BaseSectionResponse{
		ID:          section.ID,
		Name:        section.Name,
		BaseID:      section.BaseID,
		BaseName:    base.Name,
		Description: section.Description,
		CreatedBy:   section.CreatedBy,
		CreatedAt:   section.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   section.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	// 如果有队长，添加队长信息
	if section.LeaderID != nil {
		var leader models.User
		if err := db.DB.First(&leader, section.LeaderID).Error; err == nil {
			response.LeaderID = section.LeaderID
			response.LeaderName = leader.Name
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ListBaseSections 查询基地分区列表
func ListBaseSections(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以查看基地分区列表
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限查看基地分区列表", http.StatusForbidden)
		return
	}

	var sections []models.BaseSection
	query := db.DB.Preload("Base").Preload("Leader").Order("created_at desc")

	// 支持基地筛选
	if baseID := r.URL.Query().Get("base_id"); baseID != "" {
		if id, err := strconv.ParseUint(baseID, 10, 64); err == nil {
			query = query.Where("base_id = ?", id)
		}
	}

	if err := query.Find(&sections).Error; err != nil {
		http.Error(w, "查询基地分区列表失败", http.StatusInternalServerError)
		return
	}

	// 转换为响应格式
	var responses []BaseSectionResponse
	for _, section := range sections {
		response := BaseSectionResponse{
			ID:          section.ID,
			Name:        section.Name,
			BaseID:      section.BaseID,
			BaseName:    section.Base.Name,
			Description: section.Description,
			CreatedBy:   section.CreatedBy,
			CreatedAt:   section.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:   section.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		// 如果有队长，添加队长信息
		if section.Leader != nil {
			response.LeaderID = section.LeaderID
			response.LeaderName = section.Leader.Name
		}

		responses = append(responses, response)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responses)
}

// GetBaseSection 获取单个基地分区信息
func GetBaseSection(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以查看基地分区详情
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限查看基地分区详情", http.StatusForbidden)
		return
	}

	sectionID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "基地分区ID参数错误", http.StatusBadRequest)
		return
	}

	var section models.BaseSection
	if err := db.DB.Preload("Base").Preload("Leader").First(&section, sectionID).Error; err != nil {
		http.Error(w, "基地分区不存在", http.StatusNotFound)
		return
	}

	response := BaseSectionResponse{
		ID:          section.ID,
		Name:        section.Name,
		BaseID:      section.BaseID,
		BaseName:    section.Base.Name,
		Description: section.Description,
		CreatedBy:   section.CreatedBy,
		CreatedAt:   section.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   section.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	// 如果有队长，添加队长信息
	if section.Leader != nil {
		response.LeaderID = section.LeaderID
		response.LeaderName = section.Leader.Name
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdateBaseSection 更新基地分区信息
func UpdateBaseSection(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以更新基地分区
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限更新基地分区", http.StatusForbidden)
		return
	}

	sectionID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "基地分区ID参数错误", http.StatusBadRequest)
		return
	}

	var req UpdateBaseSectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Name == "" || req.BaseID == 0 {
		http.Error(w, "分区名称和所属基地不能为空", http.StatusBadRequest)
		return
	}

	// 查找基地分区
	var section models.BaseSection
	if err := db.DB.First(&section, sectionID).Error; err != nil {
		http.Error(w, "基地分区不存在", http.StatusNotFound)
		return
	}

	// 检查基地是否存在
	var base models.Base
	if err := db.DB.First(&base, req.BaseID).Error; err != nil {
		http.Error(w, "指定的基地不存在", http.StatusNotFound)
		return
	}

	// 如果指定了队长，检查队长是否存在且角色为队长
	if req.LeaderID != nil {
		var leader models.User
		if err := db.DB.First(&leader, req.LeaderID).Error; err != nil {
			http.Error(w, "指定的队长用户不存在", http.StatusNotFound)
			return
		}
		if leader.Role != "captain" {
			http.Error(w, "指定的用户不是队长角色", http.StatusBadRequest)
			return
		}
	}

	// 更新基地分区信息
	section.Name = req.Name
	section.BaseID = req.BaseID
	section.LeaderID = req.LeaderID
	section.Description = req.Description
	section.UpdatedAt = time.Now()

	if err := db.DB.Save(&section).Error; err != nil {
		http.Error(w, "更新基地分区失败", http.StatusInternalServerError)
		return
	}

	// 构建响应
	response := BaseSectionResponse{
		ID:          section.ID,
		Name:        section.Name,
		BaseID:      section.BaseID,
		BaseName:    base.Name,
		Description: section.Description,
		CreatedBy:   section.CreatedBy,
		CreatedAt:   section.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   section.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	// 如果有队长，添加队长信息
	if section.LeaderID != nil {
		var leader models.User
		if err := db.DB.First(&leader, section.LeaderID).Error; err == nil {
			response.LeaderID = section.LeaderID
			response.LeaderName = leader.Name
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// DeleteBaseSection 删除基地分区
func DeleteBaseSection(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 只有管理员可以删除基地分区
	userRole := claims["role"].(string)
	if userRole != "admin" {
		http.Error(w, "没有权限删除基地分区", http.StatusForbidden)
		return
	}

	sectionID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "基地分区ID参数错误", http.StatusBadRequest)
		return
	}

	// 查找基地分区
	var section models.BaseSection
	if err := db.DB.First(&section, sectionID).Error; err != nil {
		http.Error(w, "基地分区不存在", http.StatusNotFound)
		return
	}

	// 删除基地分区
	if err := db.DB.Delete(&section).Error; err != nil {
		http.Error(w, "删除基地分区失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "基地分区删除成功",
	})
}
