package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"fmt"
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
	SupplierID   *uint             `json:"supplier_id,omitempty"` // 供应商ID
	OrderNumber  string            `json:"order_number"`
	PurchaseDate string            `json:"purchase_date"` // yyyy-mm-dd
	TotalAmount  float64           `json:"total_amount"`
	Receiver     string            `json:"receiver"`
	BaseID       uint              `json:"base_id"` // 所属基地ID
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

	// 处理BaseID字段根据用户角色
	var baseID uint
	if userRole == "admin" {
		// 管理员可以为任意基地创建采购记录
		// 如果指定了基地ID，则使用指定的基地
		if req.BaseID != 0 {
			// 验证基地是否存在
			var base models.Base
			if err := db.DB.First(&base, req.BaseID).Error; err != nil {
				http.Error(w, "指定的基地不存在", http.StatusBadRequest)
				return
			}
			baseID = req.BaseID
		} else {
			// 如果admin用户没有指定基地，返回错误（创建记录时需要指定基地）
			http.Error(w, "管理员必须指定基地", http.StatusBadRequest)
			return
		}
	} else {
		// 基地代理只能为自己的基地创建记录
		// 获取用户关联的基地列表
		uid := uint(claims["uid"].(float64))
		var user models.User
		if err := db.DB.Preload("Bases").First(&user, uid).Error; err != nil {
			http.Error(w, "用户信息错误", http.StatusBadRequest)
			return
		}

		// 检查用户是否关联了基地
		if len(user.Bases) == 0 {
			http.Error(w, "用户未关联任何基地", http.StatusBadRequest)
			return
		}

		// 如果用户只关联了一个基地，使用该基地
		// 如果用户关联了多个基地，需要指定基地ID
		if len(user.Bases) == 1 {
			baseID = user.Bases[0].ID
		} else {
			// 用户关联了多个基地，必须指定基地ID
			if req.BaseID == 0 {
				http.Error(w, "用户关联了多个基地，请指定基地", http.StatusBadRequest)
				return
			}

			// 验证指定的基地是否在用户关联的基地列表中
			validBase := false
			for _, base := range user.Bases {
				if base.ID == req.BaseID {
					validBase = true
					baseID = base.ID
					break
				}
			}

			if !validBase {
				http.Error(w, "指定的基地不在用户关联的基地列表中", http.StatusBadRequest)
				return
			}
		}
	}

	pd, _ := time.Parse("2006-01-02", req.PurchaseDate)

	// 开始事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "数据库事务启动失败", http.StatusInternalServerError)
		return
	}

	// 创建采购记录
	p := models.PurchaseEntry{
		SupplierID:   req.SupplierID, // 使用SupplierID而不是Supplier
		OrderNumber:  req.OrderNumber,
		PurchaseDate: pd,
		TotalAmount:  req.TotalAmount,
		Receiver:     req.Receiver,
		BaseID:       baseID,
		CreatedBy:    uint(claims["uid"].(float64)),
		CreatorName:  claims["username"].(string), // 添加创建人姓名
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := tx.Create(&p).Error; err != nil {
		tx.Rollback()
		http.Error(w, "创建采购记录失败", http.StatusInternalServerError)
		return
	}

	// 创建采购明细
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
	if err := tx.Create(&items).Error; err != nil {
		tx.Rollback()
		http.Error(w, "创建采购明细失败", http.StatusInternalServerError)
		return
	}

	// 自动创建应付款记录
	// 默认设置到期日期为采购日期后30天
	dueDate := pd.AddDate(0, 0, 30)

	payable := models.PayableRecord{
		PurchaseEntryID: p.ID,
		SupplierID:      req.SupplierID, // 使用SupplierID而不是Supplier
		TotalAmount:     req.TotalAmount,
		PaidAmount:      0,
		RemainingAmount: req.TotalAmount,
		Status:          models.PayableStatusPending,
		DueDate:         &dueDate,
		BaseID:          baseID,
		CreatedBy:       uint(claims["uid"].(float64)),
	}

	if err := tx.Create(&payable).Error; err != nil {
		tx.Rollback()
		http.Error(w, "创建应付款记录失败", http.StatusInternalServerError)
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交事务失败", http.StatusInternalServerError)
		return
	}

	// 预加载关联数据用于返回
	db.DB.Preload("Items").Preload("Base").Preload("Supplier").First(&p, p.ID)
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
	q := db.DB.Preload("Items").Preload("Base").Preload("Supplier").Order("purchase_date desc")

	// 根据用户角色进行数据过滤
	if userRole == "base_agent" {
		// 基地代理只能查看自己基地的记录
		uid := uint(claims["uid"].(float64))
		var user models.User
		if err := db.DB.Preload("Bases").First(&user, uid).Error; err != nil {
			http.Error(w, "用户信息错误", http.StatusBadRequest)
			return
		}

		// 如果用户关联了基地，则只显示这些基地的采购记录
		if len(user.Bases) > 0 {
			baseIDs := make([]uint, len(user.Bases))
			for i, base := range user.Bases {
				baseIDs[i] = base.ID
			}
			q = q.Where("base_id IN ?", baseIDs)
		} else {
			// 如果用户没有关联基地，则不显示任何记录
			q = q.Where("1 = 0")
		}
<<<<<<< HEAD
	}
	// 管理员可以查看所有记录，无需额外过滤
	// 如果需要按基地筛选，可以在查询参数中指定
=======
	} else if userRole == "admin" {
		// 管理员可以查看所有记录，支持按基地筛选
		if base := r.URL.Query().Get("base"); base != "" {
			var baseModel models.Base
			if err := db.DB.Where("name = ?", base).First(&baseModel).Error; err == nil {
				q = q.Where("base_id = ?", baseModel.ID)
			}
		}
	}
>>>>>>> 40aea7b13475fe61df859812522ad8e7e258c893

	// 添加筛选条件支持
	// 供应商筛选
	if supplier := r.URL.Query().Get("supplier"); supplier != "" {
		// 通过关联的Supplier模型进行筛选
		q = q.Joins("JOIN suppliers ON purchase_entries.supplier_id = suppliers.id").
			Where("suppliers.name LIKE ?", "%"+supplier+"%")
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

<<<<<<< HEAD
	// 基地筛选（仅管理员可用）
	if userRole == "admin" {
		if base := r.URL.Query().Get("base"); base != "" {
			var baseModel models.Base
			if err := db.DB.Where("name = ?", base).First(&baseModel).Error; err == nil {
				q = q.Where("base_id = ?", baseModel.ID)
			}
		}
	}

=======
>>>>>>> 40aea7b13475fe61df859812522ad8e7e258c893
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

// 更新采购记录
func UpdatePurchase(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	userRole := claims["role"].(string)
	if userRole != "admin" && userRole != "base_agent" {
		http.Error(w, "没有权限更新采购记录", http.StatusForbidden)
		return
	}

	// 获取采购记录ID
	pid, err := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if err != nil || pid == 0 {
		http.Error(w, "无效的采购记录ID", http.StatusBadRequest)
		return
	}

	// 查找采购记录
	var purchase models.PurchaseEntry
	if err := db.DB.Preload("Items").First(&purchase, pid).Error; err != nil {
		http.Error(w, "采购记录不存在", http.StatusNotFound)
		return
	}

	// 权限检查：管理员可以更新所有记录，基地代理只能更新自己创建的记录
	uid := uint(claims["uid"].(float64))
	if !(userRole == "admin" || (userRole == "base_agent" && purchase.CreatedBy == uid)) {
		http.Error(w, "无权更新该记录", http.StatusForbidden)
		return
	}

	// 解析请求数据
	var req PurchaseReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.OrderNumber == "" || req.PurchaseDate == "" || req.TotalAmount <= 0 || req.Receiver == "" || req.BaseID == 0 {
		http.Error(w, "请填写所有必填字段", http.StatusBadRequest)
		return
	}

	// 解析日期
	pd, err := time.Parse("2006-01-02", req.PurchaseDate)
	if err != nil {
		http.Error(w, "日期格式错误", http.StatusBadRequest)
		return
	}

	// 获取基地信息
	var base models.Base
	if err := db.DB.First(&base, req.BaseID).Error; err != nil {
		http.Error(w, "基地不存在", http.StatusBadRequest)
		return
	}

	// 开始事务
	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 更新采购记录主表
	purchase.SupplierID = req.SupplierID
	purchase.OrderNumber = req.OrderNumber
	purchase.PurchaseDate = pd
	purchase.TotalAmount = req.TotalAmount
	purchase.Receiver = req.Receiver
	purchase.BaseID = req.BaseID
	purchase.Base = base
	purchase.UpdatedAt = time.Now()

	if err := tx.Save(&purchase).Error; err != nil {
		tx.Rollback()
		http.Error(w, "更新采购记录失败", http.StatusInternalServerError)
		return
	}

	// 删除原有的采购明细
	if err := tx.Where("purchase_entry_id = ?", purchase.ID).Delete(&models.PurchaseEntryItem{}).Error; err != nil {
		tx.Rollback()
		http.Error(w, "删除原有采购明细失败", http.StatusInternalServerError)
		return
	}

	// 创建新的采购明细
	items := make([]models.PurchaseEntryItem, len(req.Items))
	for i, item := range req.Items {
		// 验证明细必填字段
		if item.ProductName == "" || item.Quantity <= 0 || item.UnitPrice <= 0 {
			tx.Rollback()
			http.Error(w, fmt.Sprintf("第%d个商品信息不完整", i+1), http.StatusBadRequest)
			return
		}

		items[i] = models.PurchaseEntryItem{
			PurchaseEntryID: purchase.ID,
			ProductName:     item.ProductName,
			Quantity:        item.Quantity,
			UnitPrice:       item.UnitPrice,
			Amount:          item.Amount,
		}
	}

	if len(items) > 0 {
		if err := tx.Create(&items).Error; err != nil {
			tx.Rollback()
			http.Error(w, "创建采购明细失败", http.StatusInternalServerError)
			return
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交事务失败", http.StatusInternalServerError)
		return
	}

	// 预加载关联数据用于返回
	db.DB.Preload("Items").Preload("Base").Preload("Supplier").First(&purchase, purchase.ID)
	json.NewEncoder(w).Encode(purchase)
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
