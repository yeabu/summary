package routes

import (
	"backend/handlers"
	"backend/middleware"
	"net/http"
)

func SetupRouter() *http.ServeMux {
    mux := http.NewServeMux()
	// 登录相关
	mux.HandleFunc("/api/login", handlers.Login)
	mux.HandleFunc("/api/user/change_password", middleware.AuthMiddleware(handlers.ChangePassword, "admin", "base_agent"))

    // 采购记录管理
    mux.HandleFunc("/api/purchase/create", middleware.AuthMiddleware(handlers.CreatePurchase, "admin", "base_agent"))
    mux.HandleFunc("/api/purchase/list", middleware.AuthMiddleware(handlers.ListPurchase, "admin", "base_agent"))
    mux.HandleFunc("/api/purchase/update", middleware.AuthMiddleware(handlers.UpdatePurchase, "admin", "base_agent"))
    mux.HandleFunc("/api/purchase/delete", middleware.AuthMiddleware(handlers.DeletePurchase, "admin", "base_agent"))
    mux.HandleFunc("/api/purchase/batch-delete", middleware.AuthMiddleware(handlers.BatchDeletePurchase, "admin", "base_agent"))
    mux.HandleFunc("/api/purchase/upload-receipt", middleware.AuthMiddleware(handlers.UploadPurchaseReceipt, "admin", "base_agent"))
    // 采购建议（常用供应商、常用商品）
    mux.HandleFunc("/api/purchase/supplier-suggestions", middleware.AuthMiddleware(handlers.SupplierSuggestions, "admin", "base_agent"))
    mux.HandleFunc("/api/purchase/product-suggestions", middleware.AuthMiddleware(handlers.ProductSuggestions, "admin", "base_agent"))

    // 商品单位规格
    mux.HandleFunc("/api/product/unit-specs", middleware.AuthMiddleware(handlers.ListProductUnitSpecs, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/product/unit-specs/upsert", middleware.AuthMiddleware(handlers.UpsertProductUnitSpec, "admin"))
    mux.HandleFunc("/api/product/unit-specs/delete", middleware.AuthMiddleware(handlers.DeleteProductUnitSpec, "admin"))
    mux.HandleFunc("/api/product/unit-specs/upsert-by-name", middleware.AuthMiddleware(handlers.UpsertProductUnitSpecByName, "admin"))

    // 商品管理
    mux.HandleFunc("/api/product/list", middleware.AuthMiddleware(handlers.ListProduct, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/product/create", middleware.AuthMiddleware(handlers.CreateProduct, "admin"))
    mux.HandleFunc("/api/product/update", middleware.AuthMiddleware(handlers.UpdateProduct, "admin"))
    mux.HandleFunc("/api/product/delete", middleware.AuthMiddleware(handlers.DeleteProduct, "admin"))
    mux.HandleFunc("/api/product/export-csv", middleware.AuthMiddleware(handlers.ExportProductCSV, "admin", "base_agent"))
    mux.HandleFunc("/api/product/import-template", middleware.AuthMiddleware(handlers.DownloadProductCSVTemplate, "admin", "base_agent"))
    mux.HandleFunc("/api/product/import-csv", middleware.AuthMiddleware(handlers.ImportProductCSV, "admin"))

    // 商品采购参数
    mux.HandleFunc("/api/product/purchase-param", middleware.AuthMiddleware(handlers.GetProductPurchaseParam, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/product/purchase-param/upsert", middleware.AuthMiddleware(handlers.UpsertProductPurchaseParam, "admin", "base_agent"))
    mux.HandleFunc("/api/product/purchase-param/delete", middleware.AuthMiddleware(handlers.DeleteProductPurchaseParam, "admin"))

	// 费用记录管理
    mux.HandleFunc("/api/expense/create", middleware.AuthMiddleware(handlers.CreateExpense, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/expense/batch-create", middleware.AuthMiddleware(handlers.CreateExpenseBatch, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/expense/list", middleware.AuthMiddleware(handlers.ListExpense, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/expense/update", middleware.AuthMiddleware(handlers.UpdateExpense, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/expense/delete", middleware.AuthMiddleware(handlers.DeleteExpense, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/expense/batch-delete", middleware.AuthMiddleware(handlers.BatchDeleteExpense, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/expense/stats", middleware.AuthMiddleware(handlers.StatExpense, "admin", "base_agent"))
    // 票据上传（基地开支）
    mux.HandleFunc("/api/expense/upload-receipt", middleware.AuthMiddleware(handlers.UploadExpenseReceipt, "admin", "base_agent", "captain"))

	// 费用类别管理（仅管理员可创建、更新、删除）
	mux.HandleFunc("/api/expense-category/create", middleware.AuthMiddleware(handlers.CreateExpenseCategory, "admin"))
    mux.HandleFunc("/api/expense-category/list", middleware.AuthMiddleware(handlers.ListExpenseCategory, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/expense-category/get", middleware.AuthMiddleware(handlers.GetExpenseCategory, "admin", "base_agent", "captain"))
	mux.HandleFunc("/api/expense-category/update", middleware.AuthMiddleware(handlers.UpdateExpenseCategory, "admin"))
	mux.HandleFunc("/api/expense-category/delete", middleware.AuthMiddleware(handlers.DeleteExpenseCategory, "admin"))

	// 基地管理（仅管理员）
    mux.HandleFunc("/api/base/create", middleware.AuthMiddleware(handlers.CreateBase, "admin"))
    // base 列表与详情对 admin、base_agent 开放（便于选择基地）
    mux.HandleFunc("/api/base/list", middleware.AuthMiddleware(handlers.ListBases, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/base/get", middleware.AuthMiddleware(handlers.GetBase, "admin", "base_agent", "captain"))
	mux.HandleFunc("/api/base/update", middleware.AuthMiddleware(handlers.UpdateBase, "admin"))
	mux.HandleFunc("/api/base/delete", middleware.AuthMiddleware(handlers.DeleteBase, "admin"))
	mux.HandleFunc("/api/base/batch-delete", middleware.AuthMiddleware(handlers.BatchDeleteBases, "admin"))

	// 基地区域管理（仅管理员）
	mux.HandleFunc("/api/base-section/create", middleware.AuthMiddleware(handlers.CreateBaseSection, "admin"))
	mux.HandleFunc("/api/base-section/list", middleware.AuthMiddleware(handlers.ListBaseSections, "admin"))
	mux.HandleFunc("/api/base-section/get", middleware.AuthMiddleware(handlers.GetBaseSection, "admin"))
	mux.HandleFunc("/api/base-section/update", middleware.AuthMiddleware(handlers.UpdateBaseSection, "admin"))
	mux.HandleFunc("/api/base-section/delete", middleware.AuthMiddleware(handlers.DeleteBaseSection, "admin"))

	// 人员管理（仅管理员）
    // 人员管理：base_agent 可创建队长、查看本基地队长；其余操作仍仅管理员
    mux.HandleFunc("/api/user/create", middleware.AuthMiddleware(handlers.CreateUser, "admin", "base_agent"))
    mux.HandleFunc("/api/user/list", middleware.AuthMiddleware(handlers.ListUsers, "admin", "base_agent"))
    mux.HandleFunc("/api/user/get", middleware.AuthMiddleware(handlers.GetUser, "admin", "base_agent"))
    mux.HandleFunc("/api/user/update", middleware.AuthMiddleware(handlers.UpdateUser, "admin", "base_agent"))
    mux.HandleFunc("/api/user/delete", middleware.AuthMiddleware(handlers.DeleteUser, "admin", "base_agent"))
    mux.HandleFunc("/api/user/batch-delete", middleware.AuthMiddleware(handlers.BatchDeleteUsers, "admin", "base_agent"))
    mux.HandleFunc("/api/user/reset-password", middleware.AuthMiddleware(handlers.ResetUserPassword, "admin", "base_agent"))

	// 供应商管理
	mux.HandleFunc("/api/supplier/list", middleware.AuthMiddleware(handlers.ListSupplier, "admin", "base_agent"))
	mux.HandleFunc("/api/supplier/all", middleware.AuthMiddleware(handlers.GetAllSuppliers, "admin", "base_agent"))
	mux.HandleFunc("/api/supplier/detail", middleware.AuthMiddleware(handlers.GetSupplierDetail, "admin", "base_agent"))
	mux.HandleFunc("/api/supplier/create", middleware.AuthMiddleware(handlers.CreateSupplier, "admin", "base_agent"))
	mux.HandleFunc("/api/supplier/update", middleware.AuthMiddleware(handlers.UpdateSupplier, "admin", "base_agent"))
	mux.HandleFunc("/api/supplier/delete", middleware.AuthMiddleware(handlers.DeleteSupplier, "admin"))

	// 应付款管理
	mux.HandleFunc("/api/payable/list", middleware.AuthMiddleware(handlers.ListPayable, "admin", "base_agent"))
	mux.HandleFunc("/api/payable/summary", middleware.AuthMiddleware(handlers.GetPayableSummary, "admin", "base_agent"))
	mux.HandleFunc("/api/payable/by-supplier", middleware.AuthMiddleware(handlers.GetPayableBySupplier, "admin", "base_agent"))
    mux.HandleFunc("/api/payable/overdue", middleware.AuthMiddleware(handlers.GetOverduePayables, "admin", "base_agent"))
    mux.HandleFunc("/api/payable/detail", middleware.AuthMiddleware(handlers.GetPayableDetail, "admin", "base_agent"))
    mux.HandleFunc("/api/payable/delete", middleware.AuthMiddleware(handlers.DeletePayable, "admin"))

	// 还款记录管理
	mux.HandleFunc("/api/payment/create", middleware.AuthMiddleware(handlers.CreatePayment, "admin", "base_agent"))
	mux.HandleFunc("/api/payment/list", middleware.AuthMiddleware(handlers.ListPayments, "admin", "base_agent"))
    mux.HandleFunc("/api/payment/delete", middleware.AuthMiddleware(handlers.DeletePayment, "admin"))

    // 统计分析
    mux.HandleFunc("/api/analytics/summary", middleware.AuthMiddleware(handlers.AnalyticsSummary, "admin", "base_agent", "captain"))
    // 每基地开支（可按类别筛选）
    mux.HandleFunc("/api/analytics/expense-by-base", middleware.AuthMiddleware(handlers.ExpenseByBaseDetail, "admin", "base_agent", "captain"))
    // 每基地物资申领（可按商品筛选）
    mux.HandleFunc("/api/analytics/requisition-by-base", middleware.AuthMiddleware(handlers.RequisitionByBase, "admin", "base_agent", "captain"))

    // 汇率管理
    mux.HandleFunc("/api/rate/list", middleware.AuthMiddleware(handlers.ListExchangeRates, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/rate/upsert", middleware.AuthMiddleware(handlers.UpsertExchangeRate, "admin"))

    // 库存与申领
    mux.HandleFunc("/api/inventory/list", middleware.AuthMiddleware(handlers.InventoryList, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/inventory/requisition/create", middleware.AuthMiddleware(handlers.CreateRequisition, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/inventory/requisition/update", middleware.AuthMiddleware(handlers.UpdateRequisition, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/inventory/requisition/delete", middleware.AuthMiddleware(handlers.DeleteRequisition, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/inventory/requisition/list", middleware.AuthMiddleware(handlers.ListRequisition, "admin", "base_agent", "captain"))
    mux.HandleFunc("/api/inventory/requisition/upload-receipt", middleware.AuthMiddleware(handlers.UploadRequisitionReceipt, "admin", "base_agent", "captain"))

    // 静态文件：上传目录
    mux.Handle("/upload/", http.StripPrefix("/upload/", http.FileServer(http.Dir("upload"))))
    return mux
}
