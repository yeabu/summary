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

// PayableListResponse 应付款列表响应
type PayableListResponse struct {
	Records []models.PayableRecord `json:"records"`
	Total   int64                  `json:"total"`
}

// PayableSummaryResponse 应付款汇总响应
type PayableSummaryResponse struct {
	TotalPayable   float64 `json:"total_payable"`   // 总应付款
	TotalPaid      float64 `json:"total_paid"`      // 总已付款
	TotalRemaining float64 `json:"total_remaining"` // 总剩余款
	PendingCount   int64   `json:"pending_count"`   // 待付款数量
	PartialCount   int64   `json:"partial_count"`   // 部分付款数量
	PaidCount      int64   `json:"paid_count"`      // 已付清数量
	OverdueCount   int64   `json:"overdue_count"`   // 超期数量
}

// SupplierPayableStats 供应商应付款统计
type SupplierPayableStats struct {
	Supplier        string  `json:"supplier"`
	TotalAmount     float64 `json:"total_amount"`
	PaidAmount      float64 `json:"paid_amount"`
	RemainingAmount float64 `json:"remaining_amount"`
	RecordCount     int64   `json:"record_count"`
}

// ListPayable 获取应付款列表
func ListPayable(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看应付款记录", http.StatusForbidden)
		return
	}

	var payables []models.PayableRecord
	query := db.DB.Preload("PurchaseEntry").Preload("Base").Preload("Creator").Preload("Supplier").
		Order("created_at desc")

	// 权限过滤
	if role == "base_agent" {
		baseName := claims["base"].(string)
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
			query = query.Where("base_id = ?", base.ID)
		}
	}
	// 管理员可以查看所有记录，无需额外过滤

	// 筛选参数
	if supplier := r.URL.Query().Get("supplier"); supplier != "" {
		// 通过关联的Supplier模型进行筛选
		query = query.Joins("JOIN suppliers ON payable_records.supplier_id = suppliers.id").
			Where("suppliers.name LIKE ?", "%"+supplier+"%")
	}

	if status := r.URL.Query().Get("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// 基地筛选（仅管理员可用）
	if role == "admin" {
		if baseParam := r.URL.Query().Get("base"); baseParam != "" {
			var base models.Base
			if err := db.DB.Where("name = ?", baseParam).First(&base).Error; err == nil {
				query = query.Where("base_id = ?", base.ID)
			}
		}
	}

	// 日期范围筛选
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		query = query.Where("created_at <= ?", endDate+" 23:59:59")
	}

	// 分页
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.PayableRecord{}).Count(&total)
	query.Limit(limit).Offset(offset).Find(&payables)

	response := PayableListResponse{
		Records: payables,
		Total:   total,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetPayableSummary 获取应付款汇总统计
func GetPayableSummary(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看应付款统计", http.StatusForbidden)
		return
	}

	query := db.DB.Model(&models.PayableRecord{})

	// 权限过滤
	if role == "base_agent" {
		baseName := claims["base"].(string)
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
			query = query.Where("base_id = ?", base.ID)
		}
	}
	// 管理员可以查看所有记录，无需额外过滤

	var summary PayableSummaryResponse

	// 总计统计
	query.Select("SUM(total_amount) as total_payable, SUM(paid_amount) as total_paid, SUM(remaining_amount) as total_remaining").
		Scan(&summary)

	// 状态统计
	query.Where("status = ?", models.PayableStatusPending).Count(&summary.PendingCount)
	query.Where("status = ?", models.PayableStatusPartial).Count(&summary.PartialCount)
	query.Where("status = ?", models.PayableStatusPaid).Count(&summary.PaidCount)

	// 超期统计
	now := time.Now()
	query.Where("due_date < ? AND status != ?", now, models.PayableStatusPaid).Count(&summary.OverdueCount)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// GetPayableBySupplier 按供应商统计应付款
func GetPayableBySupplier(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看应付款统计", http.StatusForbidden)
		return
	}

	query := db.DB.Model(&models.PayableRecord{}).
		Select("suppliers.name as supplier, SUM(total_amount) as total_amount, SUM(paid_amount) as paid_amount, SUM(remaining_amount) as remaining_amount, COUNT(*) as record_count").
		Joins("JOIN suppliers ON payable_records.supplier_id = suppliers.id").
		Group("suppliers.name").
		Order("remaining_amount desc")

	// 权限过滤
	if role == "base_agent" {
		baseName := claims["base"].(string)
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
			query = query.Where("base_id = ?", base.ID)
		}
	}
	// 管理员可以查看所有记录，无需额外过滤

	var stats []SupplierPayableStats
	query.Scan(&stats)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GetOverduePayables 获取超期应付款
func GetOverduePayables(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看应付款记录", http.StatusForbidden)
		return
	}

	var payables []models.PayableRecord
	query := db.DB.Preload("PurchaseEntry").Preload("Base").Preload("Creator").Preload("Supplier").
		Where("due_date < ? AND status != ?", time.Now(), models.PayableStatusPaid).
		Order("due_date asc")

	// 权限过滤
	if role == "base_agent" {
		baseName := claims["base"].(string)
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
			query = query.Where("base_id = ?", base.ID)
		}
	}
	// 管理员可以查看所有记录，无需额外过滤

	query.Find(&payables)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payables)
}

// GetPayableDetail 获取应付款详情
func GetPayableDetail(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看应付款记录", http.StatusForbidden)
		return
	}

	payableID, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if payableID == 0 {
		http.Error(w, "无效的应付款ID", http.StatusBadRequest)
		return
	}

	var payable models.PayableRecord
	query := db.DB.Preload("PurchaseEntry").Preload("PurchaseEntry.Items").
		Preload("Base").Preload("Creator").Preload("Supplier").
		Preload("PaymentRecords").Preload("PaymentRecords.Creator")

	// 权限过滤
	if role == "base_agent" {
		baseName := claims["base"].(string)
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
			query = query.Where("base_id = ?", base.ID)
		}
	}
	// 管理员可以查看所有记录，无需额外过滤

	if err := query.First(&payable, payableID).Error; err != nil {
		http.Error(w, "应付款记录不存在", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payable)
}

// CreatePaymentRequest 创建还款记录请求
type CreatePaymentRequest struct {
	PayableID     uint    `json:"payable_id"`
	Amount        float64 `json:"amount"`
	PaymentDate   string  `json:"payment_date"`
	PaymentMethod string  `json:"payment_method"`
	Reference     string  `json:"reference"`
	Note          string  `json:"note"`
}

// CreatePayment 创建还款记录
func CreatePayment(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	userID := uint(claims["user_id"].(float64))

	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权创建还款记录", http.StatusForbidden)
		return
	}

	var req CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "请求数据格式错误", http.StatusBadRequest)
		return
	}

	// 验证必填字段
	if req.PayableID == 0 || req.Amount <= 0 {
		http.Error(w, "应付款ID和还款金额不能为空", http.StatusBadRequest)
		return
	}

	// 查找应付款记录
	var payable models.PayableRecord
	if err := db.DB.First(&payable, req.PayableID).Error; err != nil {
		http.Error(w, "应付款记录不存在", http.StatusNotFound)
		return
	}

	// 权限检查：基地代理只能处理自己基地的记录
	if role == "base_agent" {
		baseName := claims["base"].(string)
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err != nil {
			http.Error(w, "基地信息错误", http.StatusBadRequest)
			return
		}
		if payable.BaseID != base.ID {
			http.Error(w, "无权处理此应付款记录", http.StatusForbidden)
			return
		}
	}

	// 检查应付款状态
	if payable.Status == models.PayableStatusPaid {
		http.Error(w, "此应付款已付清，无法继续还款", http.StatusBadRequest)
		return
	}

	// 检查还款金额是否超过剩余金额
	if req.Amount > payable.RemainingAmount {
		http.Error(w, "还款金额不能超过剩余应付金额", http.StatusBadRequest)
		return
	}

	// 解析还款日期
	var paymentDate time.Time
	if req.PaymentDate != "" {
		if parsed, err := time.Parse("2006-01-02", req.PaymentDate); err != nil {
			http.Error(w, "还款日期格式错误", http.StatusBadRequest)
			return
		} else {
			paymentDate = parsed
		}
	} else {
		paymentDate = time.Now()
	}

	// 开始事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "数据库事务启动失败", http.StatusInternalServerError)
		return
	}

	// 创建还款记录
	payment := models.PaymentRecord{
		PayableRecordID: req.PayableID,
		PaymentAmount:   req.Amount,
		PaymentDate:     paymentDate,
		PaymentMethod:   req.PaymentMethod,
		ReferenceNumber: req.Reference,
		Notes:           req.Note,
		CreatedBy:       userID,
	}

	if err := tx.Create(&payment).Error; err != nil {
		tx.Rollback()
		http.Error(w, "创建还款记录失败", http.StatusInternalServerError)
		return
	}

	// 更新应付款记录
	newPaidAmount := payable.PaidAmount + req.Amount
	newRemainingAmount := payable.TotalAmount - newPaidAmount
	newStatus := models.PayableStatusPartial
	if newRemainingAmount <= 0.01 { // 考虑浮点数精度问题
		newStatus = models.PayableStatusPaid
		newRemainingAmount = 0
	}

	updates := map[string]interface{}{
		"paid_amount":      newPaidAmount,
		"remaining_amount": newRemainingAmount,
		"status":           newStatus,
		"updated_at":       time.Now(),
	}

	if err := tx.Model(&payable).Updates(updates).Error; err != nil {
		tx.Rollback()
		http.Error(w, "更新应付款状态失败", http.StatusInternalServerError)
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交事务失败", http.StatusInternalServerError)
		return
	}

	// 返回创建的还款记录
	db.DB.Preload("Creator").Preload("Payable").First(&payment, payment.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payment)
}

// ListPayments 获取还款记录列表
func ListPayments(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" && role != "base_agent" {
		http.Error(w, "无权查看还款记录", http.StatusForbidden)
		return
	}

	var payments []models.PaymentRecord
	query := db.DB.Preload("Payable").Preload("Payable.Base").Preload("Payable.Supplier").Preload("Creator").
		Order("payment_date desc, created_at desc")

	// 权限过滤
	if role == "base_agent" {
		baseName := claims["base"].(string)
		var base models.Base
		if err := db.DB.Where("name = ?", baseName).First(&base).Error; err == nil {
			query = query.Joins("JOIN payable_records ON payment_records.payable_record_id = payable_records.id").
				Where("payable_records.base_id = ?", base.ID)
		}
	}
	// 管理员可以查看所有记录，无需额外过滤

	// 筛选参数
	if payableID := r.URL.Query().Get("payable_id"); payableID != "" {
		query = query.Where("payable_record_id = ?", payableID)
	}

	if supplier := r.URL.Query().Get("supplier"); supplier != "" {
		query = query.Joins("JOIN payable_records pr ON payment_records.payable_record_id = pr.id").
			Joins("JOIN suppliers s ON pr.supplier_id = s.id").
			Where("s.name LIKE ?", "%"+supplier+"%")
	}

	// 日期范围筛选
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		query = query.Where("payment_date >= ?", startDate)
	}
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		query = query.Where("payment_date <= ?", endDate)
	}

	// 分页
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.PaymentRecord{}).Count(&total)
	query.Limit(limit).Offset(offset).Find(&payments)

	response := struct {
		Records []models.PaymentRecord `json:"records"`
		Total   int64                  `json:"total"`
	}{
		Records: payments,
		Total:   total,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// DeletePayment 删除还款记录
func DeletePayment(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)
	if role != "admin" {
		http.Error(w, "只有管理员可以删除还款记录", http.StatusForbidden)
		return
	}

	paymentID, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if paymentID == 0 {
		http.Error(w, "无效的还款记录ID", http.StatusBadRequest)
		return
	}

	// 查找还款记录
	var payment models.PaymentRecord
	if err := db.DB.First(&payment, paymentID).Error; err != nil {
		http.Error(w, "还款记录不存在", http.StatusNotFound)
		return
	}

	// 查找关联的应付款记录
	var payable models.PayableRecord
	if err := db.DB.First(&payable, payment.PayableRecordID).Error; err != nil {
		http.Error(w, "关联的应付款记录不存在", http.StatusNotFound)
		return
	}

	// 开始事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "数据库事务启动失败", http.StatusInternalServerError)
		return
	}

	// 删除还款记录
	if err := tx.Delete(&payment).Error; err != nil {
		tx.Rollback()
		http.Error(w, "删除还款记录失败", http.StatusInternalServerError)
		return
	}

	// 重新计算应付款状态
	var totalPaid float64
	tx.Model(&models.PaymentRecord{}).Where("payable_record_id = ?", payable.ID).Select("COALESCE(SUM(payment_amount), 0)").Scan(&totalPaid)

	newRemainingAmount := payable.TotalAmount - totalPaid
	newStatus := models.PayableStatusPending
	if totalPaid > 0 && newRemainingAmount > 0.01 {
		newStatus = models.PayableStatusPartial
	} else if newRemainingAmount <= 0.01 {
		newStatus = models.PayableStatusPaid
		newRemainingAmount = 0
	}

	updates := map[string]interface{}{
		"paid_amount":      totalPaid,
		"remaining_amount": newRemainingAmount,
		"status":           newStatus,
		"updated_at":       time.Now(),
	}

	if err := tx.Model(&payable).Updates(updates).Error; err != nil {
		tx.Rollback()
		http.Error(w, "更新应付款状态失败", http.StatusInternalServerError)
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "提交事务失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "还款记录删除成功"})
}

// UpdatePayableStatus 更新应付款状态
func UpdatePayableStatus(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.ParseJWT(r)
	if err != nil {
		http.Error(w, "token无效", http.StatusUnauthorized)
		return
	}

	role := claims["role"].(string)

	// 只有管理员可以手动更新状态
	if role != "admin" {
		http.Error(w, "无权更新应付款状态", http.StatusForbidden)
		return
	}

	// 解析请求参数
	payableID, _ := strconv.ParseUint(r.URL.Query().Get("id"), 10, 64)
	if payableID == 0 {
		http.Error(w, "无效的应付款ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "请求数据格式错误", http.StatusBadRequest)
		return
	}

	// 验证状态值
	validStatuses := map[string]bool{
		models.PayableStatusPending: true,
		models.PayableStatusPartial: true,
		models.PayableStatusPaid:    true,
	}
	if !validStatuses[req.Status] {
		http.Error(w, "无效的状态值", http.StatusBadRequest)
		return
	}

	// 查找应付款记录
	var payable models.PayableRecord
	if err := db.DB.First(&payable, payableID).Error; err != nil {
		http.Error(w, "应付款记录不存在", http.StatusNotFound)
		return
	}

	// 更新状态
	updates := map[string]interface{}{
		"status":     req.Status,
		"updated_at": time.Now(),
	}

	// 如果设置为已付清，更新相关金额
	if req.Status == models.PayableStatusPaid {
		updates["paid_amount"] = payable.TotalAmount
		updates["remaining_amount"] = 0.0
	} else if req.Status == models.PayableStatusPending {
		updates["paid_amount"] = 0.0
		updates["remaining_amount"] = payable.TotalAmount
	}

	if err := db.DB.Model(&payable).Updates(updates).Error; err != nil {
		http.Error(w, "更新应付款状态失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "应付款状态更新成功"})
}
