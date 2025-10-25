package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// CreateUserRequest 创建用户请求结构
type CreateUserRequest struct {
	Name             string `json:"name"`
	Role             string `json:"role"`               // "admin", "base_agent", "captain", "factory_manager", "warehouse_admin"
	BaseIDs          []uint `json:"base_ids,omitempty"` // 所属基地ID列表
	Password         string `json:"password"`
	JoinDate         string `json:"join_date,omitempty"` // 入司时间 (格式: 2006-01-02)
	Phone            string `json:"phone,omitempty"`     // 手机号
	Mobile           string `json:"mobile,omitempty"`    // 兼容旧字段
	Email            string `json:"email,omitempty"`
	PassportNumber   string `json:"passport_number,omitempty"` // 护照号
	VisaType         string `json:"visa_type,omitempty"`
	VisaExpiryDate   string `json:"visa_expiry_date,omitempty"` // 签证到期时间 (格式: 2006-01-02)
	IDCard           string `json:"id_card,omitempty"`
	EmergencyContact string `json:"emergency_contact,omitempty"`
	EmergencyPhone   string `json:"emergency_phone,omitempty"`
	Remark           string `json:"remark,omitempty"`
}

// UpdateUserRequest 更新用户请求结构
type UpdateUserRequest struct {
	Name             string `json:"name"`
	Role             string `json:"role"`
	BaseIDs          []uint `json:"base_ids,omitempty"`  // 所属基地ID列表
	Password         string `json:"password,omitempty"`  // 可选，为空时不更新密码
	JoinDate         string `json:"join_date,omitempty"` // 入司时间 (格式: 2006-01-02)
	Phone            string `json:"phone,omitempty"`
	Mobile           string `json:"mobile,omitempty"`
	Email            string `json:"email,omitempty"`
	PassportNumber   string `json:"passport_number,omitempty"` // 护照号
	VisaType         string `json:"visa_type,omitempty"`
	VisaExpiryDate   string `json:"visa_expiry_date,omitempty"`
	IDCard           string `json:"id_card,omitempty"`
	EmergencyContact string `json:"emergency_contact,omitempty"`
	EmergencyPhone   string `json:"emergency_phone,omitempty"`
	Remark           string `json:"remark,omitempty"`
}

// UserResponse 用户响应结构（不包含密码）
type UserResponse struct {
	ID               uint          `json:"id"`
	Name             string        `json:"name"`
	Role             string        `json:"role"`
	BaseIDs          []uint        `json:"base_ids,omitempty"` // 所属基地ID列表
	Bases            []models.Base `json:"bases,omitempty"`    // 关联的基地信息列表
	JoinDate         string        `json:"join_date,omitempty"`
	Phone            string        `json:"phone,omitempty"`
	Email            string        `json:"email,omitempty"`
	PassportNumber   string        `json:"passport_number,omitempty"`
	VisaType         string        `json:"visa_type,omitempty"`
	VisaExpiryDate   string        `json:"visa_expiry_date,omitempty"`
	IDCard           string        `json:"id_card,omitempty"`
	EmergencyContact string        `json:"emergency_contact,omitempty"`
	EmergencyPhone   string        `json:"emergency_phone,omitempty"`
	Remark           string        `json:"remark,omitempty"`
	CreatedAt        string        `json:"created_at,omitempty"`
	UpdatedAt        string        `json:"updated_at,omitempty"`
}

// CreateUser 创建用户
func CreateUser(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	// 允许 admin 和 base_agent
	var userRole string
	if v, ok := claims["role"]; ok {
		if s, ok2 := v.(string); ok2 {
			userRole = s
		}
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Name == "" || req.Role == "" || req.Password == "" {
		http.Error(w, "用户名、角色和密码不能为空", http.StatusBadRequest)
		return
	}

	// 验证创建目标角色合法性；若创建者为base_agent，仅允许创建 captain，并且必须绑定其负责的基地
	validRoles := map[string]bool{"admin": true, "base_agent": true, "captain": true, "factory_manager": true, "warehouse_admin": true}
	if !validRoles[req.Role] {
		http.Error(w, "角色参数无效", http.StatusBadRequest)
		return
	}
	if userRole == "base_agent" {
		if req.Role != "captain" {
			http.Error(w, "基地代理仅可创建队长", http.StatusForbidden)
			return
		}
		if len(req.BaseIDs) == 0 {
			http.Error(w, "必须为队长指定所属基地", http.StatusBadRequest)
			return
		}
		var creator models.User
		if v, ok := claims["uid"]; ok {
			if f, ok2 := v.(float64); ok2 {
				db.DB.Preload("Bases").First(&creator, uint(f))
			}
		}
		allowed := map[uint]bool{}
		for _, b := range creator.Bases {
			allowed[b.ID] = true
		}
		for _, bid := range req.BaseIDs {
			if !allowed[bid] {
				http.Error(w, "不能为非所属基地创建队长", http.StatusForbidden)
				return
			}
		}
	} else {
		if req.Role != "admin" && req.Role != "warehouse_admin" && len(req.BaseIDs) == 0 {
			http.Error(w, "非管理员角色必须指定至少一个基地", http.StatusBadRequest)
			return
		}
	}

	// 检查用户名是否已存在
	var existingUser models.User
	if err := db.DB.Where("name = ?", req.Name).First(&existingUser).Error; err == nil {
		http.Error(w, "用户名已存在", http.StatusConflict)
		return
	}

	// 密码加密
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "密码加密失败", http.StatusInternalServerError)
		return
	}

	// 开始事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "数据库事务启动失败", http.StatusInternalServerError)
		return
	}

	phone := req.Phone
	if phone == "" {
		phone = req.Mobile
	}
	user := models.User{
		Name:             req.Name,
		Role:             req.Role,
		Password:         string(hashedPassword),
		Phone:            phone,
		Email:            req.Email,
		PassportNumber:   req.PassportNumber,
		VisaType:         req.VisaType,
		IDCard:           req.IDCard,
		EmergencyContact: req.EmergencyContact,
		EmergencyPhone:   req.EmergencyPhone,
		Remark:           req.Remark,
	}

	// 处理可选日期字段
	if req.JoinDate != "" {
		if joinDate, err := time.Parse("2006-01-02", req.JoinDate); err == nil {
			user.JoinDate = &joinDate
		}
	}
	if req.VisaExpiryDate != "" {
		if visaDate, err := time.Parse("2006-01-02", req.VisaExpiryDate); err == nil {
			user.VisaExpiryDate = &visaDate
		}
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		http.Error(w, "创建用户失败", http.StatusInternalServerError)
		return
	}

	// 创建用户与基地的关联关系（仅对需要基地的角色）
	if req.Role != "admin" && req.Role != "warehouse_admin" {
		for _, baseID := range req.BaseIDs {
			userBase := models.UserBase{
				UserID: user.ID,
				BaseID: baseID,
			}
			if err := tx.Create(&userBase).Error; err != nil {
				tx.Rollback()
				http.Error(w, "创建用户基地关联失败", http.StatusInternalServerError)
				return
			}
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交事务失败", http.StatusInternalServerError)
		return
	}

	// 预加载基地信息
	db.DB.Preload("Bases").First(&user, user.ID)

	// 返回用户信息（不包含密码）
	response := UserResponse{
		ID:               user.ID,
		Name:             user.Name,
		Role:             user.Role,
		BaseIDs:          make([]uint, len(user.Bases)),
		Bases:            user.Bases,
		Phone:            user.Phone,
		Email:            user.Email,
		PassportNumber:   user.PassportNumber,
		VisaType:         user.VisaType,
		JoinDate:         formatTimePointer(user.JoinDate),
		VisaExpiryDate:   formatTimePointer(user.VisaExpiryDate),
		IDCard:           user.IDCard,
		EmergencyContact: user.EmergencyContact,
		EmergencyPhone:   user.EmergencyPhone,
		Remark:           user.Remark,
		CreatedAt:        user.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:        user.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	// 填充基地ID列表
	for i, base := range user.Bases {
		response.BaseIDs[i] = base.ID
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ListUsers 查询用户列表
func ListUsers(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	var userRole string
	if v, ok := claims["role"]; ok {
		if s, ok2 := v.(string); ok2 {
			userRole = s
		}
	}

	var users []models.User
	query := db.DB.Model(&models.User{}).
		Select("users.*").
		Preload("Bases").
		Order("users.id desc")

	if userRole == "base_agent" {
		// 仅查询自己基地下的队长
		var me models.User
		if v, ok := claims["uid"]; ok {
			if f, ok2 := v.(float64); ok2 {
				db.DB.Preload("Bases").First(&me, uint(f))
			}
		}
		var baseIDs []uint
		for _, b := range me.Bases {
			baseIDs = append(baseIDs, b.ID)
		}
		if len(baseIDs) == 0 {
			// 无基地则返回空
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]UserResponse{})
			return
		}
		query = query.
			Joins("JOIN user_bases ub ON ub.user_id = users.id").
			Where("ub.base_id IN ?", baseIDs).
			Where("users.role = ?", "captain").
			Group("users.id")
	} else if userRole != "admin" {
		http.Error(w, "没有权限查看用户列表", http.StatusForbidden)
		return
	}

	// 支持角色筛选
	if role := r.URL.Query().Get("role"); role != "" {
		query = query.Where("users.role = ?", role)
	}

	// 支持基地筛选
	if baseID := r.URL.Query().Get("base_id"); baseID != "" {
		if id, err := strconv.ParseUint(baseID, 10, 64); err == nil {
			// 通过关联表筛选
			query = query.Joins("JOIN user_bases ON users.id = user_bases.user_id").
				Where("user_bases.base_id = ?", id)
		}
	}

	// 支持用户名模糊搜索
	if name := r.URL.Query().Get("name"); name != "" {
		query = query.Where("name LIKE ?", "%"+name+"%")
	}

	if err := query.Find(&users).Error; err != nil {
		http.Error(w, "查询用户列表失败", http.StatusInternalServerError)
		return
	}

	// 转换为响应结构（确保空数组而非null）
	response := make([]UserResponse, 0, len(users))
	for _, user := range users {
		resp := UserResponse{
			ID:               user.ID,
			Name:             user.Name,
			Role:             user.Role,
			BaseIDs:          make([]uint, len(user.Bases)),
			Bases:            user.Bases,
			Phone:            user.Phone,
			Email:            user.Email,
			PassportNumber:   user.PassportNumber,
			VisaType:         user.VisaType,
			JoinDate:         formatTimePointer(user.JoinDate),
			VisaExpiryDate:   formatTimePointer(user.VisaExpiryDate),
			IDCard:           user.IDCard,
			EmergencyContact: user.EmergencyContact,
			EmergencyPhone:   user.EmergencyPhone,
			Remark:           user.Remark,
			CreatedAt:        user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:        user.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		// 填充基地ID列表
		for i, base := range user.Bases {
			resp.BaseIDs[i] = base.ID
		}

		response = append(response, resp)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetUser 获取单个用户信息
func GetUser(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	var userRole string
	if v, ok := claims["role"]; ok {
		if s, ok2 := v.(string); ok2 {
			userRole = s
		}
	}

	userID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "用户ID参数错误", http.StatusBadRequest)
		return
	}

	var user models.User
	if err := db.DB.Select("*").Preload("Bases").First(&user, userID).Error; err != nil {
		http.Error(w, "用户不存在", http.StatusNotFound)
		return
	}

	if userRole == "base_agent" {
		// 仅允许查看自己基地下的队长
		if user.Role != "captain" {
			http.Error(w, "无权限查看该用户", http.StatusForbidden)
			return
		}
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
		has := false
		for _, b := range user.Bases {
			if allowed[b.ID] {
				has = true
				break
			}
		}
		if !has {
			http.Error(w, "无权限查看该用户", http.StatusForbidden)
			return
		}
	} else if userRole != "admin" {
		http.Error(w, "没有权限查看用户详情", http.StatusForbidden)
		return
	}

	response := UserResponse{
		ID:               user.ID,
		Name:             user.Name,
		Role:             user.Role,
		BaseIDs:          make([]uint, len(user.Bases)),
		Bases:            user.Bases,
		Phone:            user.Phone,
		Email:            user.Email,
		PassportNumber:   user.PassportNumber,
		VisaType:         user.VisaType,
		JoinDate:         formatTimePointer(user.JoinDate),
		VisaExpiryDate:   formatTimePointer(user.VisaExpiryDate),
		IDCard:           user.IDCard,
		EmergencyContact: user.EmergencyContact,
		EmergencyPhone:   user.EmergencyPhone,
		Remark:           user.Remark,
		CreatedAt:        user.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:        user.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	// 填充基地ID列表
	for i, base := range user.Bases {
		response.BaseIDs[i] = base.ID
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdateUser 更新用户信息
func UpdateUser(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 允许 admin；base_agent 需进一步限制
	userRole := claims["role"].(string)

	userID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "用户ID参数错误", http.StatusBadRequest)
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Name == "" || req.Role == "" {
		http.Error(w, "用户名和角色不能为空", http.StatusBadRequest)
		return
	}

	// 验证角色合法性
	validRoles := map[string]bool{
		"admin":           true,
		"base_agent":      true,
		"captain":         true,
		"factory_manager": true,
		"warehouse_admin": true,
	}
	if !validRoles[req.Role] {
		http.Error(w, "角色参数无效", http.StatusBadRequest)
		return
	}

	// 非管理员角色必须指定至少一个基地
	if req.Role != "admin" && req.Role != "warehouse_admin" && len(req.BaseIDs) == 0 {
		http.Error(w, "非管理员角色必须指定至少一个基地", http.StatusBadRequest)
		return
	}

	// 查找用户
	var user models.User
	if err := db.DB.Preload("Bases").First(&user, userID).Error; err != nil {
		http.Error(w, "用户不存在", http.StatusNotFound)
		return
	}

	if userRole == "base_agent" {
		// 仅允许管理自己基地下的队长
		if user.Role != "captain" {
			http.Error(w, "基地代理仅可管理队长", http.StatusForbidden)
			return
		}
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
		for _, b := range user.Bases {
			if !allowed[b.ID] {
				http.Error(w, "无权限管理该队长", http.StatusForbidden)
				return
			}
		}
	} else if userRole != "admin" {
		http.Error(w, "没有权限更新用户", http.StatusForbidden)
		return
	}

	// 检查用户名是否与其他用户冲突
	var existingUser models.User
	if err := db.DB.Where("name = ? AND id != ?", req.Name, userID).First(&existingUser).Error; err == nil {
		http.Error(w, "用户名已存在", http.StatusConflict)
		return
	}

	// 更新用户信息
	user.Name = req.Name
	user.Role = req.Role
	if req.Phone != "" {
		user.Phone = req.Phone
	} else {
		user.Phone = req.Mobile
	}
	user.Email = req.Email
	user.PassportNumber = req.PassportNumber
	user.VisaType = req.VisaType
	user.IDCard = req.IDCard
	user.EmergencyContact = req.EmergencyContact
	user.EmergencyPhone = req.EmergencyPhone
	user.Remark = req.Remark

	// 处理日期字段
	if req.JoinDate != "" {
		if joinDate, err := time.Parse("2006-01-02", req.JoinDate); err == nil {
			user.JoinDate = &joinDate
		}
	} else {
		user.JoinDate = nil
	}

	if req.VisaExpiryDate != "" {
		if visaDate, err := time.Parse("2006-01-02", req.VisaExpiryDate); err == nil {
			user.VisaExpiryDate = &visaDate
		}
	} else {
		user.VisaExpiryDate = nil
	}

	// 如果提供了新密码，则更新密码
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "密码加密失败", http.StatusInternalServerError)
			return
		}
		user.Password = string(hashedPassword)
	}

	// 开始事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "数据库事务启动失败", http.StatusInternalServerError)
		return
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		http.Error(w, "更新用户失败", http.StatusInternalServerError)
		return
	}

	// 对于管理员用户，不需要关联基地
	if req.Role == "admin" || req.Role == "warehouse_admin" {
		// 管理员不需要基地关联，直接提交事务
		if err := tx.Commit().Error; err != nil {
			http.Error(w, "提交事务失败", http.StatusInternalServerError)
			return
		}

		// 重新加载用户信息（不包含基地关联）
		db.DB.First(&user, user.ID)

		// 返回更新后的用户信息（不包含密码）
		response := UserResponse{
			ID:               user.ID,
			Name:             user.Name,
			Role:             user.Role,
			BaseIDs:          []uint{},
			Bases:            []models.Base{},
			Phone:            user.Phone,
			Email:            user.Email,
			PassportNumber:   user.PassportNumber,
			VisaType:         user.VisaType,
			JoinDate:         formatTimePointer(user.JoinDate),
			VisaExpiryDate:   formatTimePointer(user.VisaExpiryDate),
			IDCard:           user.IDCard,
			EmergencyContact: user.EmergencyContact,
			EmergencyPhone:   user.EmergencyPhone,
			Remark:           user.Remark,
			CreatedAt:        user.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:        user.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// 更新用户与基地的关联关系（仅对非管理员角色）
	// 先删除现有的关联关系
	if err := tx.Where("user_id = ?", user.ID).Delete(&models.UserBase{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "删除旧的用户基地关联失败", http.StatusInternalServerError)
		return
	}

	// 添加新的关联关系
	if len(req.BaseIDs) > 0 {
		userBases := make([]models.UserBase, len(req.BaseIDs))
		for i, baseID := range req.BaseIDs {
			// 验证基地是否存在
			var base models.Base
			if err := tx.First(&base, baseID).Error; err != nil {
				tx.Rollback()
				http.Error(w, "指定的基地不存在", http.StatusBadRequest)
				return
			}
			userBases[i] = models.UserBase{
				UserID: user.ID,
				BaseID: baseID,
			}
		}
		if err := tx.Create(&userBases).Error; err != nil {
			tx.Rollback()
			http.Error(w, "创建用户基地关联失败", http.StatusInternalServerError)
			return
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交事务失败", http.StatusInternalServerError)
		return
	}

	// 重新加载用户信息（包含基地关联）
	db.DB.Preload("Bases").First(&user, user.ID)

	// 返回更新后的用户信息（不包含密码）
	response := UserResponse{
		ID:               user.ID,
		Name:             user.Name,
		Role:             user.Role,
		BaseIDs:          make([]uint, len(user.Bases)),
		Bases:            user.Bases,
		Phone:            user.Phone,
		Email:            user.Email,
		PassportNumber:   user.PassportNumber,
		VisaType:         user.VisaType,
		JoinDate:         formatTimePointer(user.JoinDate),
		VisaExpiryDate:   formatTimePointer(user.VisaExpiryDate),
		IDCard:           user.IDCard,
		EmergencyContact: user.EmergencyContact,
		EmergencyPhone:   user.EmergencyPhone,
		Remark:           user.Remark,
		CreatedAt:        user.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:        user.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	// 填充基地ID列表
	for i, base := range user.Bases {
		response.BaseIDs[i] = base.ID
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// DeleteUser 删除用户
func DeleteUser(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 允许 admin；base_agent 需限制
	userRole := claims["role"].(string)

	userID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "用户ID参数错误", http.StatusBadRequest)
		return
	}

	// 查找用户
	var user models.User
	if err := db.DB.Preload("Bases").First(&user, userID).Error; err != nil {
		http.Error(w, "用户不存在", http.StatusNotFound)
		return
	}

	if userRole == "base_agent" {
		if user.Role != "captain" {
			http.Error(w, "基地代理仅可删除队长", http.StatusForbidden)
			return
		}
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
		for _, b := range user.Bases {
			if !allowed[b.ID] {
				http.Error(w, "无权限删除该队长", http.StatusForbidden)
				return
			}
		}
	} else if userRole != "admin" {
		http.Error(w, "没有权限删除用户", http.StatusForbidden)
		return
	}

	// 不能删除自己
	currentUserID := uint(claims["uid"].(float64))
	if user.ID == currentUserID {
		http.Error(w, "不能删除自己的账户", http.StatusForbidden)
		return
	}

	// 检查用户是否有关联的记录
	var expenseCount int64
	if err := db.DB.Model(&models.BaseExpense{}).Where("created_by = ?", userID).Count(&expenseCount).Error; err == nil && expenseCount > 0 {
		http.Error(w, "该用户下还有费用记录，无法删除", http.StatusConflict)
		return
	}

	var purchaseCount int64
	if err := db.DB.Model(&models.PurchaseEntry{}).Where("created_by = ?", userID).Count(&purchaseCount).Error; err == nil && purchaseCount > 0 {
		http.Error(w, "该用户下还有采购记录，无法删除", http.StatusConflict)
		return
	}

	// 事务内删除用户，先清理 user_bases 关联，避免外键约束失败
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "事务启动失败", http.StatusInternalServerError)
		return
	}
	// 先清空与该用户相关的从表引用
	// 1) user_bases
	if err := tx.Where("user_id = ?", user.ID).Delete(&models.UserBase{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "清理用户基地关联失败", http.StatusInternalServerError)
		return
	}
	// 2) base_sections.leader_id 置空
	if err := tx.Model(&models.BaseSection{}).Where("leader_id = ?", user.ID).Update("leader_id", nil).Error; err != nil {
		tx.Rollback()
		http.Error(w, "清理用户与分区队长关联失败", http.StatusInternalServerError)
		return
	}
	if err := tx.Delete(&models.User{}, user.ID).Error; err != nil {
		tx.Rollback()
		http.Error(w, "删除用户失败", http.StatusInternalServerError)
		return
	}
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "用户删除成功",
	})
}

// BatchDeleteUsers 批量删除用户
type BatchDeleteUsersRequest struct {
	IDs []uint `json:"ids"`
}

func BatchDeleteUsers(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 允许 admin；base_agent 需限制
	userRole := claims["role"].(string)

	var req BatchDeleteUsersRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	if len(req.IDs) == 0 {
		http.Error(w, "未选择要删除的用户", http.StatusBadRequest)
		return
	}

	currentUserID := uint(claims["uid"].(float64))

	// 检查是否包含当前用户
	for _, id := range req.IDs {
		if id == currentUserID {
			http.Error(w, "不能删除自己的账户", http.StatusForbidden)
			return
		}
	}

	// 查询要删除的用户
	var users []models.User
	if err := db.DB.Preload("Bases").Where("id IN ?", req.IDs).Find(&users).Error; err != nil {
		http.Error(w, "查询用户失败", http.StatusInternalServerError)
		return
	}

	if len(users) == 0 {
		http.Error(w, "没有找到要删除的用户", http.StatusNotFound)
		return
	}

	// 检查每个用户是否可以删除
	for _, user := range users {
		if userRole == "base_agent" {
			if user.Role != "captain" {
				http.Error(w, "基地代理仅可删除队长", http.StatusForbidden)
				return
			}
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
			for _, b := range user.Bases {
				if !allowed[b.ID] {
					http.Error(w, "无权限删除该队长", http.StatusForbidden)
					return
				}
			}
		} else if userRole != "admin" {
			http.Error(w, "没有权限删除用户", http.StatusForbidden)
			return
		}
		// 检查费用记录关联
		var expenseCount int64
		if err := db.DB.Model(&models.BaseExpense{}).Where("created_by = ?", user.ID).Count(&expenseCount).Error; err == nil && expenseCount > 0 {
			http.Error(w, "用户「"+user.Name+"」下还有费用记录，无法删除", http.StatusConflict)
			return
		}

		// 检查采购记录关联
		var purchaseCount int64
		if err := db.DB.Model(&models.PurchaseEntry{}).Where("created_by = ?", user.ID).Count(&purchaseCount).Error; err == nil && purchaseCount > 0 {
			http.Error(w, "用户「"+user.Name+"」下还有采购记录，无法删除", http.StatusConflict)
			return
		}
	}

	// 执行批量删除：事务内先清理 user_bases 再删 users
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "事务启动失败", http.StatusInternalServerError)
		return
	}
	// 清空从表引用
	if err := tx.Where("user_id IN ?", req.IDs).Delete(&models.UserBase{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "清理用户基地关联失败", http.StatusInternalServerError)
		return
	}
	if err := tx.Model(&models.BaseSection{}).Where("leader_id IN ?", req.IDs).Update("leader_id", nil).Error; err != nil {
		tx.Rollback()
		http.Error(w, "清理用户与分区队长关联失败", http.StatusInternalServerError)
		return
	}
	if err := tx.Where("id IN ?", req.IDs).Delete(&models.User{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "批量删除用户失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"message":       "批量删除用户成功",
		"deleted_count": len(req.IDs),
	})
}

// ResetUserPassword 重置用户密码
type ResetPasswordRequest struct {
	NewPassword string `json:"new_password"`
}

func ResetUserPassword(w http.ResponseWriter, r *http.Request) {
	// JWT权限验证
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 允许 admin；base_agent 需限制
	userRole := claims["role"].(string)

	userID, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		http.Error(w, "用户ID参数错误", http.StatusBadRequest)
		return
	}

	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	if req.NewPassword == "" {
		http.Error(w, "新密码不能为空", http.StatusBadRequest)
		return
	}

	// 查找用户
	var user models.User
	if err := db.DB.Preload("Bases").First(&user, userID).Error; err != nil {
		http.Error(w, "用户不存在", http.StatusNotFound)
		return
	}

	if userRole == "base_agent" {
		if user.Role != "captain" {
			http.Error(w, "基地代理仅可重置队长密码", http.StatusForbidden)
			return
		}
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
		for _, b := range user.Bases {
			if !allowed[b.ID] {
				http.Error(w, "无权限重置该队长", http.StatusForbidden)
				return
			}
		}
	} else if userRole != "admin" {
		http.Error(w, "没有权限重置用户密码", http.StatusForbidden)
		return
	}

	// 密码加密
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "密码加密失败", http.StatusInternalServerError)
		return
	}

	// 更新密码
	if err := db.DB.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		http.Error(w, "重置密码失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "密码重置成功",
	})
}

// 添加辅助函数用于格式化时间指针
func formatTimePointer(t *time.Time) string {
	if t != nil {
		return t.Format("2006-01-02")
	}
	return ""
}
