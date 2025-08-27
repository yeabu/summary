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
	Date     string  `json:"date"`
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	Detail   string  `json:"detail"`
	Base     string  `json:"base"` // 添加base字段，用于admin用户指定基地
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

	// 确定基地信息
	var baseValue string
	if role == "admin" {
		// admin用户必须指定基地
		if req.Base == "" {
			http.Error(w, "管理员必须指定基地", http.StatusBadRequest)
			return
		}
		baseValue = req.Base
	} else {
		// base_agent使用自己的基地
		baseValue = claims["base"].(string)
	}

	t, _ := time.Parse("2006-01-02", req.Date)
	expense := models.BaseExpense{
		Base:        baseValue,
		Date:        t,
		Category:    req.Category,
		Amount:      req.Amount,
		Detail:      req.Detail,
		CreatedBy:   uint(claims["uid"].(float64)),
		CreatorName: "", // 可通过查User表填充
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	db.DB.Create(&expense)
	json.NewEncoder(w).Encode(expense)
}

func ListExpense(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}
	var expenses []models.BaseExpense
	query := db.DB.Order("date desc")
	if role := claims["role"].(string); role == "base_agent" {
		base := claims["base"].(string)
		query = query.Where("base = ?", base)
	} else if role == "admin" {
		if base := r.URL.Query().Get("base"); base != "" {
			query = query.Where("base = ?", base)
		}
	}
	if cat := r.URL.Query().Get("category"); cat != "" {
		query = query.Where("category = ?", cat)
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
	db.DB.First(&item, eid)
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
	db.DB.Model(&item).Updates(models.BaseExpense{
		Date:      t,
		Category:  req.Category,
		Amount:    req.Amount,
		Detail:    req.Detail,
		UpdatedAt: time.Now(),
	})
	db.DB.First(&item, eid)
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

	group := db.DB.Model(&models.BaseExpense{}).Select("base, category, DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as total").
		Where("date >= ? AND date < ?", startDate, endDate)
	if role := claims["role"].(string); role == "base_agent" {
		group = group.Where("base = ?", claims["base"].(string))
	} else if base != "" {
		group = group.Where("base = ?", base)
	}
	group = group.Group("base, category, month").Order("base, category")
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
