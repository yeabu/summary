package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type ExpenseReq struct {
	Date       string  `json:"date"`
	CategoryID uint    `json:"category_id"` // 修改为 category_id
	Amount     float64 `json:"amount"`
	Currency   string  `json:"currency"`
	Detail     string  `json:"detail"`
	BaseID     uint    `json:"base_id"` // base_id：管理员可指定任一基地
}

// 批量新增开支
type ExpenseBatchResp struct {
	Created []models.BaseExpense `json:"created"`
	Failed  int                  `json:"failed"`
	Message string               `json:"message"`
}

func CreateExpenseBatch(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" && role != "captain" {
		http.Error(w, "无权创建开支记录", http.StatusForbidden)
		return
	}

	// 输入格式：{ "items": [ {...}, {...} ] }
	var payload struct {
		BaseID uint         `json:"base_id"`
		Items  []ExpenseReq `json:"items"`
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&payload); err != nil {
		http.Error(w, "参数错误：请以 {\\\"items\\\":[...]} 方式提交", http.StatusBadRequest)
		return
	}
	items := payload.Items
	if len(items) == 0 {
		http.Error(w, "items 不能为空", http.StatusBadRequest)
		return
	}

	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "事务启动失败", http.StatusInternalServerError)
		return
	}
	var created []models.BaseExpense
	failed := 0

	// 获取创建人姓名
	var creator models.User
	if uidF, ok := claims["uid"].(float64); ok {
		_ = tx.First(&creator, uint(uidF)).Error
	}

	// 解析基地权限
	var allowedBaseIDs []uint
	if role == "base_agent" || role == "captain" {
		// 从 JWT 的 bases(代码列表) 映射到 Base IDs
		var codes []string
		if v, ok := claims["bases"]; ok && v != nil {
			if arr, ok2 := v.([]interface{}); ok2 {
				for _, x := range arr {
					if s, ok3 := x.(string); ok3 {
						codes = append(codes, s)
					}
				}
			}
		}
		if len(codes) > 0 {
			var bs []models.Base
			if err := tx.Where("code IN ?", codes).Find(&bs).Error; err == nil {
				for _, b := range bs {
					allowedBaseIDs = append(allowedBaseIDs, b.ID)
				}
			}
		}
		if len(allowedBaseIDs) == 0 {
			tx.Rollback()
			http.Error(w, "当前用户未绑定基地", http.StatusBadRequest)
			return
		}
	}

	for _, req := range items {
		// 基本校验
		if req.Date == "" || req.CategoryID == 0 || req.Amount <= 0 {
			failed++
			continue
		}
		// 类别校验
		var cat models.ExpenseCategory
		if err := tx.Where("id = ? AND status = 'active'", req.CategoryID).First(&cat).Error; err != nil {
			failed++
			continue
		}
		// 基地确定
		var baseID *uint
		if role == "base_agent" || role == "captain" {
			// base_agent：优先使用 items/base_id 或 payload.BaseID，但必须在 allowedBaseIDs 内；
			// 若都未提供则默认第一个允许基地
			var target uint
			if req.BaseID != 0 {
				target = req.BaseID
			} else if payload.BaseID != 0 {
				target = payload.BaseID
			}
			if target != 0 {
				ok := false
				for _, id := range allowedBaseIDs {
					if id == target {
						ok = true
						break
					}
				}
				if !ok {
					failed++
					continue
				}
				bid := target
				baseID = &bid
			} else {
				bid := allowedBaseIDs[0]
				baseID = &bid
			}
		} else { // admin
			if req.BaseID != 0 {
				var base models.Base
				if err := tx.First(&base, req.BaseID).Error; err != nil {
					failed++
					continue
				}
				bid := base.ID
				baseID = &bid
			} else if payload.BaseID != 0 {
				var base models.Base
				if err := tx.First(&base, payload.BaseID).Error; err != nil {
					failed++
					continue
				}
				bid := base.ID
				baseID = &bid
			}
		}
		// 解析日期
		t, _ := time.Parse("2006-01-02", req.Date)
		exp := models.BaseExpense{
			Date:       t,
			CategoryID: req.CategoryID,
			Amount:     req.Amount,
			Currency: func() string {
				if req.Currency != "" {
					return req.Currency
				}
				return "CNY"
			}(),
			Detail:      req.Detail,
			CreatedBy:   uint(claims["uid"].(float64)),
			CreatorName: creator.Name,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		if baseID != nil {
			exp.BaseID = baseID
		}
		if err := tx.Create(&exp).Error; err != nil {
			failed++
			continue
		}
		created = append(created, exp)
	}

	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交失败", http.StatusInternalServerError)
		return
	}
	// 预加载后返回
	for i := range created {
		db.DB.Preload("Base").Preload("Category").First(&created[i], created[i].ID)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ExpenseBatchResp{Created: created, Failed: failed, Message: "ok"})
}

// UploadExpenseReceipt 接收基地开支票据上传
// 支持表单字段：
// - date: YYYY-MM-DD（可选，默认今天，用于创建日期目录）
// - expense_id: 可选，若提供则保存路径到对应记录的 receipt_path 字段
// - file: 必填，multipart 文件
func UploadExpenseReceipt(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "未授权", http.StatusUnauthorized)
		return
	}
	role, _ := claims["role"].(string)
	if !(role == "admin" || role == "base_agent" || role == "captain") {
		http.Error(w, "无权限", http.StatusForbidden)
		return
	}

	// 限制请求大小（例如 20MB）
	r.Body = http.MaxBytesReader(w, r.Body, 20<<20)
	if err := r.ParseMultipartForm(25 << 20); err != nil {
		http.Error(w, "上传数据过大或格式错误", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "缺少文件", http.StatusBadRequest)
		return
	}
	defer file.Close()

	dateStr := strings.TrimSpace(r.FormValue("date"))
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}
	// 校验日期格式
	if _, err := time.Parse("2006-01-02", dateStr); err != nil {
		http.Error(w, "date 格式应为 YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	// 确保上传目录存在，并滚动清理 30 天前目录
	baseDir := "upload"
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		http.Error(w, "创建上传目录失败", http.StatusInternalServerError)
		return
	}
	cleanupOldUploadDirs(baseDir, 30)

	dayDir := filepath.Join(baseDir, dateStr)
	if err := os.MkdirAll(dayDir, 0755); err != nil {
		http.Error(w, "创建日期目录失败", http.StatusInternalServerError)
		return
	}

	// 生成文件名，保留扩展名
	ext := filepath.Ext(header.Filename)
	if len(ext) > 10 {
		ext = ext[:10]
	}
	name := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dstPath := filepath.Join(dayDir, name)

	// 保存文件
	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "保存文件失败", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "写入文件失败", http.StatusInternalServerError)
		return
	}

	// 可选：写入到开支记录
	var updated *models.BaseExpense
	if eid := strings.TrimSpace(r.FormValue("expense_id")); eid != "" {
		if id64, err := strconv.ParseUint(eid, 10, 64); err == nil && id64 > 0 {
			var exp models.BaseExpense
			if err := db.DB.First(&exp, uint(id64)).Error; err == nil {
				rel := "/" + filepath.ToSlash(filepath.Join(baseDir, dateStr, name))
				_ = db.DB.Model(&exp).Update("receipt_path", rel).Error
				updated = &exp
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	rel := "/" + filepath.ToSlash(filepath.Join(baseDir, dateStr, name))
	if updated != nil {
		json.NewEncoder(w).Encode(map[string]any{"path": rel, "expense": updated})
	} else {
		json.NewEncoder(w).Encode(map[string]any{"path": rel})
	}
}

// cleanupOldUploadDirs 删除 baseDir 下超过 keepDays 的日期目录（格式 YYYY-MM-DD）
func cleanupOldUploadDirs(baseDir string, keepDays int) {
	entries, err := os.ReadDir(baseDir)
	if err != nil {
		return
	}
	cutoff := time.Now().AddDate(0, 0, -keepDays)
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		// 仅处理符合日期格式的目录
		d, err := time.Parse("2006-01-02", name)
		if err != nil {
			continue
		}
		if d.Before(cutoff) {
			_ = os.RemoveAll(filepath.Join(baseDir, name))
		}
	}
}

func CreateExpense(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" && role != "captain" {
		http.Error(w, "无权创建开支记录", http.StatusForbidden)
		return
	}

	var req ExpenseReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.Date == "" {
		http.Error(w, "日期不能为空", http.StatusBadRequest)
		return
	}
	if req.CategoryID == 0 {
		http.Error(w, "费用类别不能为空", http.StatusBadRequest)
		return
	}
	if req.Amount <= 0 {
		http.Error(w, "金额必须大于0", http.StatusBadRequest)
		return
	}

	// 验证费用类别是否存在且有效
	var category models.ExpenseCategory
	if err := db.DB.Where("id = ? AND status = 'active'", req.CategoryID).First(&category).Error; err != nil {
		http.Error(w, "指定的费用类别无效或已停用", http.StatusBadRequest)
		return
	}

	// 确定基地信息
	var baseID uint
	if role == "admin" {
		// 管理员：若指定了 base_id，校验并使用；未指定则允许创建为平台级记录（BaseID 为空）
		if req.BaseID != 0 {
			baseID = req.BaseID
			var base models.Base
			if err := db.DB.First(&base, baseID).Error; err != nil {
				http.Error(w, "指定的基地不存在", http.StatusBadRequest)
				return
			}
		}
	} else {
		// base_agent / captain：使用其允许的基地
		var codes []string
		if v, ok := claims["bases"]; ok && v != nil {
			if arr, ok2 := v.([]interface{}); ok2 {
				for _, x := range arr {
					if s, ok3 := x.(string); ok3 {
						codes = append(codes, s)
					}
				}
			}
		}
		if len(codes) == 0 {
			http.Error(w, "当前用户未绑定基地", http.StatusBadRequest)
			return
		}
		var bs []models.Base
		if err := db.DB.Where("code IN ?", codes).Find(&bs).Error; err != nil || len(bs) == 0 {
			http.Error(w, "当前用户未绑定有效基地", http.StatusBadRequest)
			return
		}
		// 若请求带了 base_id，需在允许集合内；否则默认第一个
		if req.BaseID != 0 {
			ok := false
			for _, b := range bs {
				if b.ID == req.BaseID {
					ok = true
					break
				}
			}
			if !ok {
				http.Error(w, "无权在该基地创建开支", http.StatusForbidden)
				return
			}
			baseID = req.BaseID
		} else {
			baseID = bs[0].ID
		}
	}

	t, _ := time.Parse("2006-01-02", req.Date)

	// 获取创建人姓名
	var creator models.User
	if uidF, ok := claims["uid"].(float64); ok {
		_ = db.DB.First(&creator, uint(uidF)).Error
	}

	// Create the expense record
	expense := models.BaseExpense{
		Date:       t,
		CategoryID: req.CategoryID,
		Amount:     req.Amount,
		Currency: func() string {
			if req.Currency != "" {
				return req.Currency
			}
			return "CNY"
		}(),
		Detail:      req.Detail,
		CreatedBy:   uint(claims["uid"].(float64)),
		CreatorName: creator.Name,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Only set BaseID if it's not zero (to handle optional base for admin users)
	if baseID != 0 {
		expense.BaseID = &baseID
	}

	if err := db.DB.Create(&expense).Error; err != nil {
		http.Error(w, "创建开支记录失败", http.StatusInternalServerError)
		return
	}

	// 预加载关联数据
	db.DB.Preload("Base").Preload("Category").First(&expense, expense.ID)
	json.NewEncoder(w).Encode(expense)
}

func ListExpense(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	var expenses []models.BaseExpense
	query := db.DB.Preload("Base").Preload("Category").Order("date desc")
	uid := uint(claims["uid"].(float64))
	role := claims["role"].(string)
	if role == "base_agent" || role == "captain" {
		// base_agent / captain: 限制为其关联基地集合
		var codes []string
		if v, ok := claims["bases"]; ok && v != nil {
			if arr, ok2 := v.([]interface{}); ok2 {
				for _, x := range arr {
					if s, ok3 := x.(string); ok3 {
						codes = append(codes, s)
					}
				}
			}
		}
		if len(codes) > 0 {
			var bs []models.Base
			if err := db.DB.Where("code IN ?", codes).Find(&bs).Error; err == nil {
				var ids []uint
				for _, b := range bs {
					ids = append(ids, b.ID)
				}
				if len(ids) > 0 {
					query = query.Where("base_id IN ?", ids)
				}
			}
		}
	} else if role == "admin" {
		// 管理员可按多种方式过滤：base_id / base_code / base(名称)
		if bid := r.URL.Query().Get("base_id"); bid != "" {
			if id, err := strconv.ParseUint(bid, 10, 64); err == nil {
				query = query.Where("base_id = ?", uint(id))
			}
		} else if baseCode := r.URL.Query().Get("base_code"); baseCode != "" {
			var baseModel models.Base
			if err := db.DB.Where("code = ?", baseCode).First(&baseModel).Error; err == nil {
				query = query.Where("base_id = ?", baseModel.ID)
			}
		} else if baseName := r.URL.Query().Get("base"); baseName != "" { // 兼容旧参数：base 为名称
			var baseModel models.Base
			if err := db.DB.Where("name = ?", baseName).First(&baseModel).Error; err == nil {
				query = query.Where("base_id = ?", baseModel.ID)
			}
		}
	}
	if createdBy := r.URL.Query().Get("created_by"); createdBy != "" {
		if createdBy == "me" {
			query = query.Where("created_by = ?", uid)
		} else if cid, err := strconv.ParseUint(createdBy, 10, 64); err == nil {
			if role == "admin" || uint(cid) == uid {
				query = query.Where("created_by = ?", uint(cid))
			} else {
				query = query.Where("created_by = ?", uid)
			}
		}
	}
	if cat := r.URL.Query().Get("category"); cat != "" {
		// 支持通过类别名称过滤
		var category models.ExpenseCategory
		if err := db.DB.Where("name = ?", cat).First(&category).Error; err == nil {
			query = query.Where("category_id = ?", category.ID)
		}
	}
	if cid := r.URL.Query().Get("category_id"); cid != "" {
		// 支持通过类别ID过滤
		query = query.Where("category_id = ?", cid)
	}
	if ym := r.URL.Query().Get("month"); ym != "" {
		// 修复日期范围查询 - 使用正确的月份结束日期
		t, _ := time.Parse("2006-01", ym)
		nextMonth := t.AddDate(0, 1, 0)
		startDate := ym + "-01"
		endDate := nextMonth.Format("2006-01-02")
		query = query.Where("date >= ? AND date < ?", startDate, endDate)
	}
	query.Find(&expenses)

	// 补全CreatorName（兼容历史数据为空的记录）
	missingIDs := make(map[uint]struct{})
	for _, e := range expenses {
		if e.CreatedBy != 0 && (e.CreatorName == "" || e.CreatorName == "-") {
			missingIDs[e.CreatedBy] = struct{}{}
		}
	}
	if len(missingIDs) > 0 {
		ids := make([]uint, 0, len(missingIDs))
		for id := range missingIDs {
			ids = append(ids, id)
		}
		var users []models.User
		if err := db.DB.Select("id, name").Where("id IN ?", ids).Find(&users).Error; err == nil {
			nameMap := make(map[uint]string, len(users))
			for _, u := range users {
				nameMap[u.ID] = u.Name
			}
			for i := range expenses {
				if expenses[i].CreatorName == "" {
					if n, ok := nameMap[expenses[i].CreatedBy]; ok {
						expenses[i].CreatorName = n
					}
				}
			}
		}
	}
	json.NewEncoder(w).Encode(expenses)
}

func UpdateExpense(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	eid, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	var item models.BaseExpense
	db.DB.Preload("Base").Preload("Category").First(&item, eid)
	if item.ID == 0 {
		http.Error(w, "数据不存在", http.StatusNotFound)
		return
	}
	uid := uint(claims["uid"].(float64))
	role := claims["role"].(string)
	if !(role == "admin" || ((role == "base_agent" || role == "captain") && item.CreatedBy == uid)) {
		http.Error(w, "无权修改", http.StatusForbidden)
		return
	}
	var req ExpenseReq
	json.NewDecoder(r.Body).Decode(&req)
	t, _ := time.Parse("2006-01-02", req.Date)

	// 验证费用类别（如果提供了新的类别）
	if req.CategoryID != 0 && req.CategoryID != item.CategoryID {
		var category models.ExpenseCategory
		if err := db.DB.Where("id = ? AND status = 'active'", req.CategoryID).First(&category).Error; err != nil {
			http.Error(w, "指定的费用类别无效或已停用", http.StatusBadRequest)
			return
		}
		item.CategoryID = req.CategoryID
	}

	db.DB.Model(&item).Updates(models.BaseExpense{
		Date:       t,
		CategoryID: req.CategoryID,
		Amount:     req.Amount,
		Currency: func() string {
			if req.Currency != "" {
				return req.Currency
			}
			return item.Currency
		}(),
		Detail:    req.Detail,
		UpdatedAt: time.Now(),
	})
	db.DB.Preload("Base").Preload("Category").First(&item, eid)
	json.NewEncoder(w).Encode(item)
}

type ExpenseStat struct {
	Base     string  `json:"base"`
	Category string  `json:"category"`
	Month    string  `json:"month"`
	Currency string  `json:"currency"`
	Total    float64 `json:"total"`
}

func StatExpense(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	month := r.URL.Query().Get("month")
	if len(month) != 7 {
		http.Error(w, "month参数错误", http.StatusBadRequest)
		return
	}
	base := r.URL.Query().Get("base") // 兼容：名称
	baseIDParam := r.URL.Query().Get("base_id")
	baseCode := r.URL.Query().Get("base_code")
	var result []ExpenseStat

	// 修复日期范围查询 - 使用正确的月份结束日期
	// 解析输入月份并计算下个月第一天
	t, _ := time.Parse("2006-01", month)
	nextMonth := t.AddDate(0, 1, 0)
	startDate := month + "-01"
	endDate := nextMonth.Format("2006-01-02")

	group := db.DB.Model(&models.BaseExpense{}).
		Select("bases.name as base, expense_categories.name as category, DATE_FORMAT(base_expenses.date, '%Y-%m') as month, base_expenses.currency as currency, SUM(base_expenses.amount) as total").
		Joins("LEFT JOIN bases ON bases.id = base_expenses.base_id").
		Joins("LEFT JOIN expense_categories ON expense_categories.id = base_expenses.category_id").
		Where("base_expenses.date >= ? AND base_expenses.date < ?", startDate, endDate)
	if role := claims["role"].(string); role == "base_agent" || role == "captain" {
		var codes []string
		if v, ok := claims["bases"]; ok && v != nil {
			if arr, ok2 := v.([]interface{}); ok2 {
				for _, x := range arr {
					if s, ok3 := x.(string); ok3 {
						codes = append(codes, s)
					}
				}
			}
		}
		if len(codes) > 0 {
			group = group.Where("bases.code IN ?", codes)
		} else {
			group = group.Where("1=0")
		}
	} else {
		// 管理员：支持 base_id / base_code / base(名称)
		if baseIDParam != "" {
			if id, err := strconv.ParseUint(baseIDParam, 10, 64); err == nil {
				group = group.Where("bases.id = ?", uint(id))
			}
		} else if baseCode != "" {
			group = group.Where("bases.code = ?", baseCode)
		} else if base != "" {
			group = group.Where("bases.name = ?", base)
		}
	}
	group = group.Group("bases.name, expense_categories.name, month, base_expenses.currency").Order("bases.name, expense_categories.name")
	group.Scan(&result)
	json.NewEncoder(w).Encode(result)
}

// 删除单个费用记录
func DeleteExpense(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	eid, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	var item models.BaseExpense
	db.DB.First(&item, eid)
	if item.ID == 0 {
		http.Error(w, "数据不存在", http.StatusNotFound)
		return
	}

	uid := uint(claims["uid"].(float64))
	role := claims["role"].(string)
	if !(role == "admin" || (role == "base_agent" && item.CreatedBy == uid)) {
		http.Error(w, "无权删除", http.StatusForbidden)
		return
	}

	db.DB.Delete(&item)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "删除成功",
	})
}

// 批量删除费用记录
type BatchDeleteRequest struct {
	IDs []uint `json:"ids"`
}

func BatchDeleteExpense(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	var req BatchDeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	if len(req.IDs) == 0 {
		http.Error(w, "未选择要删除的记录", http.StatusBadRequest)
		return
	}

	uid := uint(claims["uid"].(float64))
	role := claims["role"].(string)

	// 查询要删除的记录
	var items []models.BaseExpense
	query := db.DB.Where("id IN ?", req.IDs)

	// 权限检查：基地代理/队长只能删除自己创建的记录
	if role == "base_agent" || role == "captain" {
		query = query.Where("created_by = ?", uid)
	}

	query.Find(&items)

	if len(items) == 0 {
		http.Error(w, "没有找到可删除的记录", http.StatusNotFound)
		return
	}

	// 执行批量删除
	result := db.DB.Delete(&items)
	if result.Error != nil {
		http.Error(w, "删除失败: "+result.Error.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"message":       "批量删除成功",
		"deleted_count": result.RowsAffected,
	})
}
