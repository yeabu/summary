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
	mux.HandleFunc("/api/purchase/delete", middleware.AuthMiddleware(handlers.DeletePurchase, "admin", "base_agent"))
	mux.HandleFunc("/api/purchase/batch-delete", middleware.AuthMiddleware(handlers.BatchDeletePurchase, "admin", "base_agent"))

	// 费用记录管理
	mux.HandleFunc("/api/expense/create", middleware.AuthMiddleware(handlers.CreateExpense, "admin", "base_agent"))
	mux.HandleFunc("/api/expense/list", middleware.AuthMiddleware(handlers.ListExpense, "admin", "base_agent"))
	mux.HandleFunc("/api/expense/update", middleware.AuthMiddleware(handlers.UpdateExpense, "admin", "base_agent"))
	mux.HandleFunc("/api/expense/delete", middleware.AuthMiddleware(handlers.DeleteExpense, "admin", "base_agent"))
	mux.HandleFunc("/api/expense/batch-delete", middleware.AuthMiddleware(handlers.BatchDeleteExpense, "admin", "base_agent"))
	mux.HandleFunc("/api/expense/stats", middleware.AuthMiddleware(handlers.StatExpense, "admin", "base_agent"))

	// 费用类别管理（仅管理员可创建、更新、删除）
	mux.HandleFunc("/api/expense-category/create", middleware.AuthMiddleware(handlers.CreateExpenseCategory, "admin"))
	mux.HandleFunc("/api/expense-category/list", middleware.AuthMiddleware(handlers.ListExpenseCategory, "admin", "base_agent"))
	mux.HandleFunc("/api/expense-category/get", middleware.AuthMiddleware(handlers.GetExpenseCategory, "admin", "base_agent"))
	mux.HandleFunc("/api/expense-category/update", middleware.AuthMiddleware(handlers.UpdateExpenseCategory, "admin"))
	mux.HandleFunc("/api/expense-category/delete", middleware.AuthMiddleware(handlers.DeleteExpenseCategory, "admin"))

	// 基地管理（仅管理员）
	mux.HandleFunc("/api/base/create", middleware.AuthMiddleware(handlers.CreateBase, "admin"))
	mux.HandleFunc("/api/base/list", middleware.AuthMiddleware(handlers.ListBases, "admin"))
	mux.HandleFunc("/api/base/get", middleware.AuthMiddleware(handlers.GetBase, "admin"))
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
	mux.HandleFunc("/api/user/create", middleware.AuthMiddleware(handlers.CreateUser, "admin"))
	mux.HandleFunc("/api/user/list", middleware.AuthMiddleware(handlers.ListUsers, "admin"))
	mux.HandleFunc("/api/user/get", middleware.AuthMiddleware(handlers.GetUser, "admin"))
	mux.HandleFunc("/api/user/update", middleware.AuthMiddleware(handlers.UpdateUser, "admin"))
	mux.HandleFunc("/api/user/delete", middleware.AuthMiddleware(handlers.DeleteUser, "admin"))
	mux.HandleFunc("/api/user/batch-delete", middleware.AuthMiddleware(handlers.BatchDeleteUsers, "admin"))
	mux.HandleFunc("/api/user/reset-password", middleware.AuthMiddleware(handlers.ResetUserPassword, "admin"))

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

	// 还款记录管理
	mux.HandleFunc("/api/payment/create", middleware.AuthMiddleware(handlers.CreatePayment, "admin", "base_agent"))
	mux.HandleFunc("/api/payment/list", middleware.AuthMiddleware(handlers.ListPayments, "admin", "base_agent"))
	mux.HandleFunc("/api/payment/delete", middleware.AuthMiddleware(handlers.DeletePayment, "admin"))

	return mux
}