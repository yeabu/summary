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
    BaseID     uint    `json:"base_id"` // base_id：管理员可指定任一基地
}

// 批量新增开支
type ExpenseBatchResp struct {
    Created  []models.BaseExpense `json:"created"`
    Failed   int                 `json:"failed"`
    Message  string              `json:"message"`
}

func CreateExpenseBatch(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil { http.Error(w, "token无效", http.StatusUnauthorized); return }
    role := claims["role"].(string)
    if role != "admin" && role != "base_agent" { http.Error(w, "无权创建开支记录", http.StatusForbidden); return }

    // 输入格式：{ "items": [ {...}, {...} ] }
    var payload struct{ BaseID uint `json:"base_id"`; Items []ExpenseReq `json:"items"` }
    dec := json.NewDecoder(r.Body)
    dec.DisallowUnknownFields()
    if err := dec.Decode(&payload); err != nil {
        http.Error(w, "参数错误：请以 {\\\"items\\\":[...]} 方式提交", http.StatusBadRequest)
        return
    }
    items := payload.Items
    if len(items) == 0 {
        http.Error(w, "items 不能为空", http.StatusBadRequest); return
    }

    tx := db.DB.Begin()
    if tx.Error != nil { http.Error(w, "事务启动失败", http.StatusInternalServerError); return }
    var created []models.BaseExpense
    failed := 0

    // 解析基地（对 base_agent 固定自身基地；admin 每条可带 base_id，未带则不设置）
    var agentBaseID uint
    if role == "base_agent" {
        baseName := claims["base"].(string)
        var base models.Base
        if err := tx.Where("name = ?", baseName).First(&base).Error; err != nil {
            tx.Rollback(); http.Error(w, "用户基地信息错误", http.StatusBadRequest); return
        }
        agentBaseID = base.ID
    }

    for _, req := range items {
        // 基本校验
        if req.Date == "" || req.CategoryID == 0 || req.Amount <= 0 {
            failed++; continue
        }
        // 类别校验
        var cat models.ExpenseCategory
        if err := tx.Where("id = ? AND status = 'active'", req.CategoryID).First(&cat).Error; err != nil { failed++; continue }
        // 基地确定
        var baseID *uint
        if role == "base_agent" {
            if agentBaseID != 0 { bid := agentBaseID; baseID = &bid }
        } else { // admin
            if req.BaseID != 0 {
                var base models.Base
                if err := tx.First(&base, req.BaseID).Error; err != nil { failed++; continue }
                bid := base.ID; baseID = &bid
            } else if payload.BaseID != 0 {
                var base models.Base
                if err := tx.First(&base, payload.BaseID).Error; err != nil { failed++; continue }
                bid := base.ID; baseID = &bid
            }
        }
        // 解析日期
        t, _ := time.Parse("2006-01-02", req.Date)
        exp := models.BaseExpense{
            Date:       t,
            CategoryID: req.CategoryID,
            Amount:     req.Amount,
            Detail:     req.Detail,
            CreatedBy:  uint(claims["uid"].(float64)),
            CreatedAt:  time.Now(),
            UpdatedAt:  time.Now(),
        }
        if baseID != nil { exp.BaseID = baseID }
        if err := tx.Create(&exp).Error; err != nil { failed++; continue }
        created = append(created, exp)
    }

    if err := tx.Commit().Error; err != nil { http.Error(w, "提交失败", http.StatusInternalServerError); return }
    // 预加载后返回
    for i := range created {
        db.DB.Preload("Base").Preload("Category").First(&created[i], created[i].ID)
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(ExpenseBatchResp{ Created: created, Failed: failed, Message: "ok" })
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
    var baseName string
    if role == "admin" {
        // 管理员：若指定了 base_id，校验并使用；未指定则允许创建为平台级记录（BaseID 为空）
        if req.BaseID != 0 {
            baseID = req.BaseID
            var base models.Base
            if err := db.DB.First(&base, baseID).Error; err != nil {
                http.Error(w, "指定的基地不存在", http.StatusBadRequest)
                return
            }
            baseName = base.Name
        }
    } else {
        // base_agent使用自己的基地，需要通过基地名称查找ID
        baseName = claims["base"].(string)
        var base models.Base
        if err := db.DB.Where("name = ?", baseName).First(&base).Error; err != nil {
            http.Error(w, "用户基地信息错误", http.StatusBadRequest)
            return
        }
        baseID = base.ID
    }

	t, _ := time.Parse("2006-01-02", req.Date)
	
	// Create the expense record
	expense := models.BaseExpense{
		Date:        t,
		CategoryID:  req.CategoryID,
		Amount:      req.Amount,
		Detail:      req.Detail,
		CreatedBy:   uint(claims["uid"].(float64)),
		CreatorName: "", // 可通过查User表填充
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
    if role := claims["role"].(string); role == "base_agent" {
        baseName := claims["base"].(string)
        // 通过基地名称查找基地ID
        var base models.Base
        if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
            query = query.Where("base_id = ?", base.ID)
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
		Select("bases.name as base, expense_categories.name as category, DATE_FORMAT(base_expenses.date, '%Y-%m') as month, SUM(base_expenses.amount) as total").
		Joins("LEFT JOIN bases ON bases.id = base_expenses.base_id").
		Joins("LEFT JOIN expense_categories ON expense_categories.id = base_expenses.category_id").
		Where("base_expenses.date >= ? AND base_expenses.date < ?", startDate, endDate)
    if role := claims["role"].(string); role == "base_agent" {
        baseName := claims["base"].(string)
        group = group.Where("bases.name = ?", baseName)
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
