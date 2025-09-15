package handlers

import (
    "backend/db"
    "backend/middleware"
    "backend/models"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strings"
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
    // 防止panic导致空响应
    defer func() {
        if rec := recover(); rec != nil {
            log.Printf("[CreatePurchase] panic: %v", rec)
            http.Error(w, "内部错误: purchase.create", http.StatusInternalServerError)
        }
    }()
    claims, err := middleware.ParseJWT(r)
    if err != nil {
        http.Error(w, "token无效", http.StatusUnauthorized)
        return
    }

    // 允许admin和base_agent都可以创建采购记录（健壮获取role，避免断言panic）
    var userRole string
    if v, ok := claims["role"]; ok && v != nil {
        if s, ok2 := v.(string); ok2 {
            userRole = s
        }
    }
    if userRole != "admin" && userRole != "base_agent" {
        http.Error(w, "没有权限创建采购记录", http.StatusForbidden)
        return
    }

    var req PurchaseReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "参数错误", http.StatusBadRequest)
        return
    }

    // 基础参数校验
    if req.SupplierID == nil || *req.SupplierID == 0 {
        http.Error(w, "supplier_id 必填", http.StatusBadRequest)
        return
    }
    if len(req.Items) == 0 {
        http.Error(w, "采购明细不能为空", http.StatusBadRequest)
        return
    }
    for _, it := range req.Items {
        if strings.TrimSpace(it.ProductName) == "" {
            http.Error(w, "商品名称不能为空", http.StatusBadRequest)
            return
        }
        if it.Quantity <= 0 || it.UnitPrice <= 0 {
            http.Error(w, "商品数量和单价必须大于0", http.StatusBadRequest)
            return
        }
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
    } else { // base_agent
        // 基地代理只能为自己的基地创建记录
        // 获取用户关联的基地列表（健壮获取uid）
        var uid uint
        if v, ok := claims["uid"]; ok && v != nil {
            if f, ok2 := v.(float64); ok2 { uid = uint(f) }
        } else if v, ok := claims["user_id"]; ok && v != nil {
            if f, ok2 := v.(float64); ok2 { uid = uint(f) }
        }
        if uid == 0 {
            http.Error(w, "token缺少用户信息", http.StatusUnauthorized)
            return
        }
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
    // 若未提供总额，按明细求和
    if req.TotalAmount <= 0 {
        var sum float64
        for _, it := range req.Items {
            sum += it.Quantity * it.UnitPrice
        }
        req.TotalAmount = sum
    }

	// 开始事务
	tx := db.DB.Begin()
	if tx.Error != nil {
		http.Error(w, "数据库事务启动失败", http.StatusInternalServerError)
		return
	}

	// 创建采购记录
    // 提取创建人信息
    var creatorID uint
    if v, ok := claims["uid"]; ok && v != nil {
        if f, ok2 := v.(float64); ok2 { creatorID = uint(f) }
    } else if v, ok := claims["user_id"]; ok && v != nil {
        if f, ok2 := v.(float64); ok2 { creatorID = uint(f) }
    }
    var creatorName string
    if v, ok := claims["username"]; ok && v != nil {
        if s, ok2 := v.(string); ok2 { creatorName = s }
    }
    p := models.PurchaseEntry{
        SupplierID:   req.SupplierID, // 使用SupplierID而不是Supplier
        OrderNumber:  req.OrderNumber,
        PurchaseDate: pd,
        TotalAmount:  req.TotalAmount,
        Receiver:     req.Receiver,
        BaseID:       baseID,
        CreatedBy:    creatorID,
        CreatorName:  creatorName,
        CreatedAt:    time.Now(),
        UpdatedAt:    time.Now(),
    }
    if err := tx.Create(&p).Error; err != nil {
        tx.Rollback()
        log.Printf("[CreatePurchase] create purchase error: %v", err)
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
        log.Printf("[CreatePurchase] create items error: %v", err)
        http.Error(w, "创建采购明细失败", http.StatusInternalServerError)
        return
    }

    // 自动创建/聚合应付款记录
    // 规则：
    // - 若供应商结算方式为 immediate（即付），则按采购单生成独立的应付款
    // - 若为 monthly（按月）或 flexible（不定期），则聚合到该供应商+基地的未结清应付款；
    //   monthly 会按采购月聚合到 period_month 相同的记录

    // 读取供应商结算方式（可为空）
    settlementType := "flexible"
    settlementDay := 0
    if req.SupplierID != nil && *req.SupplierID != 0 {
        var sup models.Supplier
        if err := tx.First(&sup, *req.SupplierID).Error; err == nil {
            if sup.SettlementType != "" { settlementType = sup.SettlementType }
            if sup.SettlementDay != nil { settlementDay = *sup.SettlementDay }
        }
    }

    periodMonth := ""
    periodHalf := ""
    if settlementType == "monthly" {
        periodMonth = pd.Format("2006-01")
    } else if settlementType == "flexible" {
        // 半年分段：H1=1-6月，H2=7-12月
        half := "H1"
        if int(pd.Month()) >= 7 { half = "H2" }
        periodHalf = fmt.Sprintf("%04d-%s", pd.Year(), half)
    }

    var payable models.PayableRecord
    if settlementType == "immediate" {
        // 独立创建
        dueDate := pd.AddDate(0, 0, 30)
        // 提取用户ID
        var uid uint
        if v, ok := claims["uid"]; ok && v != nil {
            if f, ok2 := v.(float64); ok2 { uid = uint(f) }
        } else if v, ok := claims["user_id"]; ok && v != nil {
            if f, ok2 := v.(float64); ok2 { uid = uint(f) }
        } else {
            tx.Rollback()
            http.Error(w, "token缺少用户信息", http.StatusUnauthorized)
            return
        }

        payable = models.PayableRecord{
            PurchaseEntryID: &p.ID,
            SupplierID:      req.SupplierID,
            TotalAmount:     req.TotalAmount,
            PaidAmount:      0,
            RemainingAmount: req.TotalAmount,
            Status:          models.PayableStatusPending,
            DueDate:         &dueDate,
            BaseID:          baseID,
            CreatedBy:       uid,
            PeriodMonth:     periodMonth,
            PeriodHalf:      periodHalf,
        }
        if err := tx.Create(&payable).Error; err != nil {
            tx.Rollback()
            log.Printf("[CreatePurchase] create payable(immediate) error: %v", err)
            http.Error(w, "创建应付款记录失败", http.StatusInternalServerError)
            return
        }
    } else {
        // 聚合：查找同供应商+基地且未结清的应付款（按月则匹配 period_month）
        q := tx.Where("base_id = ? AND status IN ?", baseID, []string{models.PayableStatusPending, models.PayableStatusPartial})
        if req.SupplierID != nil { q = q.Where("supplier_id = ?", *req.SupplierID) } else { q = q.Where("supplier_id IS NULL") }
        if periodMonth != "" {
            q = q.Where("period_month = ?", periodMonth)
        } else {
            q = q.Where("(period_month = '' OR period_month IS NULL)")
        }
        if periodHalf != "" {
            q = q.Where("period_half = ?", periodHalf)
        } else {
            q = q.Where("(period_half = '' OR period_half IS NULL)")
        }

        err := q.First(&payable).Error
        if err != nil {
            // 未找到则创建新的聚合应付款
            var due *time.Time
            if settlementType == "monthly" {
                // 按月：到期日为当月结算日（若未设置，默认月末）
                y, m, _ := pd.Date()
                day := settlementDay
                if day <= 0 || day > 28 { // 简化处理：>28按月末
                    // 月末
                    firstNext := time.Date(y, m, 1, 0, 0, 0, 0, pd.Location()).AddDate(0, 1, 0)
                    lastOfMonth := firstNext.AddDate(0, 0, -1)
                    due = &lastOfMonth
                } else {
                    d := time.Date(y, m, day, 0, 0, 0, 0, pd.Location())
                    due = &d
                }
            }
            // 提取用户ID
            var uid2 uint
            if v, ok := claims["uid"]; ok {
                uid2 = uint(v.(float64))
            } else if v, ok := claims["user_id"]; ok && v != nil {
                uid2 = uint(v.(float64))
            } else {
                tx.Rollback()
                http.Error(w, "token缺少用户信息", http.StatusUnauthorized)
                return
            }

            payable = models.PayableRecord{
                SupplierID:      req.SupplierID,
                TotalAmount:     0,
                PaidAmount:      0,
                RemainingAmount: 0,
                Status:          models.PayableStatusPending,
                DueDate:         due,
                BaseID:          baseID,
                CreatedBy:       uid2,
                PeriodMonth:     periodMonth,
                PeriodHalf:      periodHalf,
            }
            if err := tx.Create(&payable).Error; err != nil {
                tx.Rollback()
                http.Error(w, "创建聚合应付款失败", http.StatusInternalServerError)
                return
            }
        }

        // 关联采购到应付款，并累计金额
        link := models.PayableLink{
            PayableRecordID: payable.ID,
            PurchaseEntryID: p.ID,
            Amount:          req.TotalAmount,
        }
        if err := tx.Create(&link).Error; err != nil {
            tx.Rollback()
            log.Printf("[CreatePurchase] create payable link error: %v", err)
            http.Error(w, "创建应付款关联失败", http.StatusInternalServerError)
            return
        }

        // 更新应付款金额与剩余
        newTotal := payable.TotalAmount + req.TotalAmount
        updates := map[string]interface{}{
            "total_amount":     newTotal,
            "remaining_amount": newTotal - payable.PaidAmount,
            "updated_at":       time.Now(),
        }
        if err := tx.Model(&payable).Updates(updates).Error; err != nil {
            tx.Rollback()
            log.Printf("[CreatePurchase] update payable totals error: %v", err)
            http.Error(w, "更新应付款金额失败", http.StatusInternalServerError)
            return
        }
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
	} else if userRole == "admin" {
		// 管理员可以查看所有记录，支持按基地筛选
		if base := r.URL.Query().Get("base"); base != "" {
			var baseModel models.Base
			if err := db.DB.Where("name = ?", base).First(&baseModel).Error; err == nil {
				q = q.Where("base_id = ?", baseModel.ID)
			}
		}
	}

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

	q.Find(&purchases)
	json.NewEncoder(w).Encode(purchases)
}

// SupplierSuggestions 返回常用供应商（按采购使用次数排序）
func SupplierSuggestions(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil {
        http.Error(w, "token无效", http.StatusUnauthorized)
        return
    }
    role := claims["role"].(string)
    if role != "admin" && role != "base_agent" {
        http.Error(w, "无权访问", http.StatusForbidden)
        return
    }

    limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
    if limit <= 0 || limit > 50 { limit = 15 }

    type Row struct {
        ID   uint   `json:"id"`
        Name string `json:"name"`
        Cnt  int64  `json:"count"`
    }
    var rows []Row
    db.DB.
        Table("suppliers s").
        Select("s.id, s.name, COUNT(pe.id) as cnt").
        Joins("LEFT JOIN purchase_entries pe ON pe.supplier_id = s.id").
        Group("s.id, s.name").
        Order("cnt DESC, s.updated_at DESC").
        Limit(limit).
        Scan(&rows)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(rows)
}

// ProductSuggestions 返回某供应商的常用商品及建议单价
func ProductSuggestions(w http.ResponseWriter, r *http.Request) {
    claims, err := middleware.ParseJWT(r)
    if err != nil {
        http.Error(w, "token无效", http.StatusUnauthorized)
        return
    }
    role := claims["role"].(string)
    if role != "admin" && role != "base_agent" {
        http.Error(w, "无权访问", http.StatusForbidden)
        return
    }

    sidStr := r.URL.Query().Get("supplier_id")
    sid, _ := strconv.ParseUint(sidStr, 10, 64)
    if sid == 0 {
        http.Error(w, "supplier_id 必填", http.StatusBadRequest)
        return
    }
    limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
    if limit <= 0 || limit > 100 { limit = 15 }

    type Row struct {
        ProductName string  `json:"product_name"`
        AvgPrice    float64 `json:"avg_price"`
        Times       int64   `json:"times"`
        LastDate    string  `json:"last_date"`
    }
    var rows []Row
    db.DB.
        Table("purchase_entry_items pei").
        Select("pei.product_name, AVG(pei.unit_price) as avg_price, COUNT(*) as times, DATE_FORMAT(MAX(pe.purchase_date), '%Y-%m-%d') as last_date").
        Joins("JOIN purchase_entries pe ON pe.id = pei.purchase_entry_id").
        Where("pe.supplier_id = ?", sid).
        Group("pei.product_name").
        Order("times DESC, MAX(pe.purchase_date) DESC").
        Limit(limit).
        Scan(&rows)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(rows)
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
