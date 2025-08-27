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

type PurchaseItemReq struct {
	ProductName string  `json:"product_name"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	Amount      float64 `json:"amount"`
}
type PurchaseReq struct {
	Supplier     string            `json:"supplier"`
	OrderNumber  string            `json:"order_number"`
	PurchaseDate string            `json:"purchase_date"` // yyyy-mm-dd
	TotalAmount  float64           `json:"total_amount"`
	Receiver     string            `json:"receiver"`
	Base         string            `json:"base"` // 所属基地
	Items        []PurchaseItemReq `json:"items"`
}

func CreatePurchase(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	// 允许admin和base_agent都可以创建采购记录
	userRole := claims["role"].(string)
	if userRole != "admin" && userRole != "base_agent" {
		http.Error(w, "没有权限创建采购记录", http.StatusForbidden)
		return
	}

	var req PurchaseReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 处理Base字段根据用户角色
	var baseValue string
	if userRole == "admin" {
		// 管理员可以为任意基地创建记录
		if req.Base == "" {
			http.Error(w, "管理员必须指定基地", http.StatusBadRequest)
			return
		}
		baseValue = req.Base
	} else {
		// 基地代理只能为自己的基地创建记录
		baseValue = claims["base"].(string)
	}

	pd, _ := time.Parse("2006-01-02", req.PurchaseDate)
	p := models.PurchaseEntry{
		Supplier:     req.Supplier,
		OrderNumber:  req.OrderNumber,
		PurchaseDate: pd,
		TotalAmount:  req.TotalAmount,
		Receiver:     req.Receiver,
		Base:         baseValue,
		CreatedBy:    uint(claims["uid"].(float64)),
		CreatorName:  claims["username"].(string), // 添加创建人姓名
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	db.DB.Create(&p)
	items := make([]models.PurchaseEntryItem, len(req.Items))
	for i, item := range req.Items {
		items[i] = models.PurchaseEntryItem{
			PurchaseEntryID: p.ID,
			ProductName:     item.ProductName,
			Quantity:        item.Quantity,
			UnitPrice:       item.UnitPrice,
			Amount:          item.Amount,
		}
	}
	db.DB.Create(&items)
	json.NewEncoder(w).Encode(p)
}

func ListPurchase(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	userRole := claims["role"].(string)
	if userRole != "admin" && userRole != "base_agent" {
		http.Error(w, "没有权限查看采购记录", http.StatusForbidden)
		return
	}

	var purchases []models.PurchaseEntry
	q := db.DB.Preload("Items").Order("purchase_date desc")

	// 根据用户角色进行数据过滤
	if userRole == "base_agent" {
		// 基地代理只能查看自己基地的记录
		userBase := claims["base"].(string)
		q = q.Where("base = ?", userBase)
	} else if userRole == "admin" {
		// 管理员可以查看所有记录，支持按基地筛选
		if base := r.URL.Query().Get("base"); base != "" {
			q = q.Where("base = ?", base)
		}
	}

	// 添加筛选条件支持
	// 供应商筛选
	if supplier := r.URL.Query().Get("supplier"); supplier != "" {
		q = q.Where("supplier LIKE ?", "%"+supplier+"%")
	}

	// 订单号筛选
	if orderNumber := r.URL.Query().Get("order_number"); orderNumber != "" {
		q = q.Where("order_number LIKE ?", "%"+orderNumber+"%")
	}

	// 日期范围筛选
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		if startTime, err := time.Parse("2006-01-02", startDate); err == nil {
			q = q.Where("purchase_date >= ?", startTime)
		}
	}

	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		if endTime, err := time.Parse("2006-01-02", endDate); err == nil {
			// 包含结束日期的整天，所以加1天
			endTime = endTime.AddDate(0, 0, 1)
			q = q.Where("purchase_date < ?", endTime)
		}
	}

	q.Find(&purchases)
	json.NewEncoder(w).Encode(purchases)
}

// 删除单个采购记录
func DeletePurchase(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	userRole := claims["role"].(string)
	if userRole != "admin" && userRole != "base_agent" {
		http.Error(w, "没有权限删除采购记录", http.StatusForbidden)
		return
	}

	pid, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	var purchase models.PurchaseEntry
	db.DB.First(&purchase, pid)
	if purchase.ID == 0 {
		http.Error(w, "数据不存在", http.StatusNotFound)
		return
	}

	uid := uint(claims["uid"].(float64))
	// 权限检查：管理员可以删除所有记录，基地代理只能删除自己创建的记录
	if !(userRole == "admin" || (userRole == "base_agent" && purchase.CreatedBy == uid)) {
		http.Error(w, "无权删除该记录", http.StatusForbidden)
		return
	}

	// 先删除相关的采购明细
	db.DB.Where("purchase_entry_id = ?", purchase.ID).Delete(&models.PurchaseEntryItem{})
	// 再删除采购记录
	db.DB.Delete(&purchase)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "删除成功",
	})
}

// 批量删除采购记录
type BatchDeletePurchaseRequest struct {
	IDs []uint `json:"ids"`
}

func BatchDeletePurchase(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	userRole := claims["role"].(string)
	if userRole != "admin" && userRole != "base_agent" {
		http.Error(w, "没有权限删除采购记录", http.StatusForbidden)
		return
	}

	var req BatchDeletePurchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	if len(req.IDs) == 0 {
		http.Error(w, "未选择要删除的记录", http.StatusBadRequest)
		return
	}

	uid := uint(claims["uid"].(float64))

	// 查询要删除的记录
	var purchases []models.PurchaseEntry
	query := db.DB.Where("id IN ?", req.IDs)

	// 权限检查：基地代理只能删除自己创建的记录
	if userRole == "base_agent" {
		query = query.Where("created_by = ?", uid)
	}

	query.Find(&purchases)

	if len(purchases) == 0 {
		http.Error(w, "没有找到可删除的记录", http.StatusNotFound)
		return
	}

	// 先删除相关的采购明细
	var purchaseIDs []uint
	for _, p := range purchases {
		purchaseIDs = append(purchaseIDs, p.ID)
	}
	db.DB.Where("purchase_entry_id IN ?", purchaseIDs).Delete(&models.PurchaseEntryItem{})

	// 再删除采购记录
	result := db.DB.Delete(&purchases)
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
