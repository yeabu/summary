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

type ExpenseReq struct {
	Date       string  `json:"date"`
	CategoryID uint    `json:"category_id"` // 修改为 category_id
	Amount     float64 `json:"amount"`
	Detail     string  `json:"detail"`
	BaseID     uint    `json:"base_id"` // 修改为 base_id，用于admin用户指定基地
}

func CreateExpense(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
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
		// 对于管理员用户，基地是可选的
		if req.BaseID != 0 {
			// 如果指定了基地ID，则验证基地是否存在
			var base models.Base
			if err := db.DB.First(&base, req.BaseID).Error; err != nil {
				http.Error(w, "指定的基地不存在", http.StatusBadRequest)
				return
			}
			baseID = req.BaseID
		}
		// 如果没有指定基地ID，允许创建没有基地关联的记录
	} else {
		// 对于基地代理用户，必须使用其所属基地
		baseName := claims["base"].(string)
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err != nil {
			http.Error(w, "用户基地信息错误", http.StatusBadRequest)
			return
		}
		baseID = base.ID
		
		// 确保基地代理不能指定其他基地
		if req.BaseID != 0 && req.BaseID != baseID {
			http.Error(w, "基地代理只能为自己的基地创建开支记录", http.StatusBadRequest)
			return
		}
	}

	t, _ := time.Parse("2006-01-02", req.Date)
	expense := models.BaseExpense{
		CategoryID:  req.CategoryID,
		Amount:      req.Amount,
		Detail:      req.Detail,
		CreatedBy:   uint(claims["uid"].(float64)),
		CreatorName: "", // 可通过查User表填充
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Date:        t,
	}
	
	// 只有当基地ID有效时才设置BaseID字段
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
	
	// 权限过滤
	if role := claims["role"].(string); role == "base_agent" {
		baseName := claims["base"].(string)
		// 通过基地名称查找基地ID
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
			query = query.Where("base_id = ?", base.ID)
		}
	}
	// 管理员可以查看所有记录，无需额外过滤

	// 筛选参数
	if role := claims["role"].(string); role == "admin" {
		if base := r.URL.Query().Get("base"); base != "" {
			// 支持通过基地名称过滤
			var baseModel models.Base
			if err := db.DB.Where("name = ?", base).First(&baseModel).Error; err == nil {
				query = query.Where("base_id = ?", baseModel.ID)
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
	
	// 添加日期范围筛选支持
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		query = query.Where("date >= ?", startDate)
	}
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		query = query.Where("date <= ?", endDate)
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
	if !(role == "admin" || (role == "base_agent" && item.CreatedBy == uid)) {
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
		Detail:     req.Detail,
		UpdatedAt:  time.Now(),
	})
	db.DB.Preload("Base").Preload("Category").First(&item, eid)
	json.NewEncoder(w).Encode(item)
}

type ExpenseStat struct {
	Base     string  `json:"base"`
	Category string  `json:"category"`
	Month    string  `json:"month"`
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
	base := r.URL.Query().Get("base")
	var result []ExpenseStat

	// 修复日期范围查询 - 使用正确的月份结束日期
	// 解析输入月份并计算下个月第一天
	t, _ := time.Parse("2006-01", month)
	nextMonth := t.AddDate(0, 1, 0)
	startDate := month + "-01"
	endDate := nextMonth.Format("2006-01-02")

	group := db.DB.Model(&models.BaseExpense{}).
		Select("bases.name as base, expense_categories.name as category, DATE_FORMAT(base_expenses.date, '%Y-%m') as month, SUM(base_expenses.amount) as total").
		Joins("LEFT JOIN bases ON bases.id = base_expenses.base_id").
		Joins("LEFT JOIN expense_categories ON expense_categories.id = base_expenses.category_id").
		Where("base_expenses.date >= ? AND base_expenses.date < ?", startDate, endDate)
		
	// 权限过滤
	if role := claims["role"].(string); role == "base_agent" {
		baseName := claims["base"].(string)
		group = group.Where("bases.name = ?", baseName)
	} else if role == "admin" && base != "" {
		// 管理员可以查看所有记录，但如果指定了基地，则按基地筛选
		group = group.Where("bases.name = ?", base)
	}
	group = group.Group("bases.name, expense_categories.name, month").Order("bases.name, expense_categories.name")
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

	// 权限检查：基地代理只能删除自己创建的记录
	if role == "base_agent" {
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
