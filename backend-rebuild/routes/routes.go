package routes

import (
    "net/http"
    "summary/backend-rebuild/handlers"
    "summary/backend-rebuild/middleware"
)

func SetupRouter() *http.ServeMux {
    mux := http.NewServeMux()

    mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("ok"))
    })

    // Auth
    mux.HandleFunc("/api/login", method("POST", handlers.Login))

    // Dev seed (guarded by DEV_SEED_ENABLED=true)
    mux.HandleFunc("/api/dev/seed-admin", method("POST", handlers.SeedAdmin))

    // Purchases
    mux.HandleFunc("/api/purchase/create", method("POST", middleware.AuthMiddleware(handlers.CreatePurchase, "admin", "base_agent")))
    mux.HandleFunc("/api/purchase/list", method("GET", middleware.AuthMiddleware(handlers.ListPurchase, "admin", "base_agent")))
    mux.HandleFunc("/api/purchase/update", method("PUT", middleware.AuthMiddleware(handlers.UpdatePurchase, "admin", "base_agent")))
    mux.HandleFunc("/api/purchase/delete", method("DELETE", middleware.AuthMiddleware(handlers.DeletePurchase, "admin", "base_agent")))
    mux.HandleFunc("/api/purchase/batch-delete", method("POST", middleware.AuthMiddleware(handlers.BatchDeletePurchase, "admin")))
    mux.HandleFunc("/api/purchase/supplier-suggestions", method("GET", middleware.AuthMiddleware(handlers.SupplierSuggestions, "admin", "base_agent")))
    mux.HandleFunc("/api/purchase/product-suggestions", method("GET", middleware.AuthMiddleware(handlers.ProductSuggestions, "admin", "base_agent")))
    mux.HandleFunc("/api/purchase/suggest-price", method("GET", middleware.AuthMiddleware(handlers.PurchaseSuggestPrice, "admin", "base_agent")))

    // Product unit specs
    mux.HandleFunc("/api/product/unit-specs", method("GET", middleware.AuthMiddleware(handlers.ListProductUnitSpecs, "admin", "base_agent")))
    mux.HandleFunc("/api/product/unit-specs/upsert", method("POST", middleware.AuthMiddleware(handlers.UpsertProductUnitSpec, "admin")))
    mux.HandleFunc("/api/product/unit-specs/delete", method("DELETE", middleware.AuthMiddleware(handlers.DeleteProductUnitSpec, "admin")))

    // Product purchase params
    mux.HandleFunc("/api/product/purchase-param", method("GET", middleware.AuthMiddleware(handlers.PurchaseParamGet, "admin", "base_agent")))
    mux.HandleFunc("/api/product/purchase-param/upsert", method("POST", middleware.AuthMiddleware(handlers.PurchaseParamUpsert, "admin", "base_agent")))
    mux.HandleFunc("/api/product/purchase-param/delete", method("DELETE", middleware.AuthMiddleware(handlers.PurchaseParamDelete, "admin")))

    // Suppliers
    mux.HandleFunc("/api/supplier/list", method("GET", middleware.AuthMiddleware(handlers.SupplierList, "admin", "base_agent")))
    mux.HandleFunc("/api/supplier/all", method("GET", middleware.AuthMiddleware(handlers.SupplierAll, "admin", "base_agent")))
    mux.HandleFunc("/api/supplier/detail", method("GET", middleware.AuthMiddleware(handlers.SupplierDetail, "admin", "base_agent")))
    mux.HandleFunc("/api/supplier/create", method("POST", middleware.AuthMiddleware(handlers.SupplierCreate, "admin")))
    mux.HandleFunc("/api/supplier/update", method("PUT", middleware.AuthMiddleware(handlers.SupplierUpdate, "admin")))
    mux.HandleFunc("/api/supplier/delete", method("DELETE", middleware.AuthMiddleware(handlers.SupplierDelete, "admin")))

    // Payables
    mux.HandleFunc("/api/payable/list", method("GET", middleware.AuthMiddleware(handlers.PayableList, "admin", "base_agent")))
    mux.HandleFunc("/api/payable/detail", method("GET", middleware.AuthMiddleware(handlers.PayableDetail, "admin", "base_agent")))
    mux.HandleFunc("/api/payable/update-status", method("POST", middleware.AuthMiddleware(handlers.UpdatePayableStatus, "admin")))
    mux.HandleFunc("/api/payable/summary", method("GET", middleware.AuthMiddleware(handlers.GetPayableSummary, "admin", "base_agent")))
    mux.HandleFunc("/api/payable/by-supplier", method("GET", middleware.AuthMiddleware(handlers.GetPayableBySupplier, "admin", "base_agent")))
    mux.HandleFunc("/api/payable/overdue", method("GET", middleware.AuthMiddleware(handlers.GetOverduePayables, "admin", "base_agent")))

    // Payments
    mux.HandleFunc("/api/payment/create", method("POST", middleware.AuthMiddleware(handlers.PaymentCreate, "admin", "base_agent")))
    mux.HandleFunc("/api/payment/list", method("GET", middleware.AuthMiddleware(handlers.PaymentList, "admin", "base_agent")))
    mux.HandleFunc("/api/payment/delete", method("DELETE", middleware.AuthMiddleware(handlers.PaymentDelete, "admin")))

    // Expenses
    mux.HandleFunc("/api/expense/create", method("POST", middleware.AuthMiddleware(handlers.ExpenseCreate, "admin", "base_agent")))
    mux.HandleFunc("/api/expense/list", method("GET", middleware.AuthMiddleware(handlers.ExpenseList, "admin", "base_agent")))
    mux.HandleFunc("/api/expense/update", method("POST", middleware.AuthMiddleware(handlers.ExpenseUpdate, "admin", "base_agent")))
    mux.HandleFunc("/api/expense/delete", method("DELETE", middleware.AuthMiddleware(handlers.ExpenseDelete, "admin")))
    mux.HandleFunc("/api/expense/batch-delete", method("POST", middleware.AuthMiddleware(handlers.ExpenseBatchDelete, "admin")))
    mux.HandleFunc("/api/expense/stats", method("GET", middleware.AuthMiddleware(handlers.ExpenseStats, "admin")))

    // Expense categories
    mux.HandleFunc("/api/expense-category/create", method("POST", middleware.AuthMiddleware(handlers.ExpenseCategoryCreate, "admin")))
    mux.HandleFunc("/api/expense-category/list", method("GET", middleware.AuthMiddleware(handlers.ExpenseCategoryList, "admin", "base_agent")))
    mux.HandleFunc("/api/expense-category/get", method("GET", middleware.AuthMiddleware(handlers.ExpenseCategoryGet, "admin", "base_agent")))
    mux.HandleFunc("/api/expense-category/update", method("PUT", middleware.AuthMiddleware(handlers.ExpenseCategoryUpdate, "admin")))
    mux.HandleFunc("/api/expense-category/delete", method("DELETE", middleware.AuthMiddleware(handlers.ExpenseCategoryDelete, "admin")))

    // Analytics
    mux.HandleFunc("/api/analytics/summary", method("GET", middleware.AuthMiddleware(handlers.AnalyticsSummary, "admin", "base_agent")))

    // Exchange rates
    mux.HandleFunc("/api/rate/list", method("GET", middleware.AuthMiddleware(handlers.ExchangeRateList, "admin", "base_agent", "captain")))

    // Admin jobs
    mux.HandleFunc("/api/admin/refresh-monthly", method("POST", middleware.AuthMiddleware(handlers.RefreshMonthlyMaterialized, "admin")))
    mux.HandleFunc("/api/admin/refresh-monthly-range", method("POST", middleware.AuthMiddleware(handlers.RefreshMonthlyRange, "admin")))

    // Bases
    mux.HandleFunc("/api/base/create", method("POST", middleware.AuthMiddleware(handlers.BaseCreate, "admin")))
    mux.HandleFunc("/api/base/list", method("GET", middleware.AuthMiddleware(handlers.BaseList, "admin")))
    mux.HandleFunc("/api/base/get", method("GET", middleware.AuthMiddleware(handlers.BaseGet, "admin")))
    mux.HandleFunc("/api/base/update", method("PUT", middleware.AuthMiddleware(handlers.BaseUpdate, "admin")))
    mux.HandleFunc("/api/base/delete", method("DELETE", middleware.AuthMiddleware(handlers.BaseDelete, "admin")))
    mux.HandleFunc("/api/base/batch-delete", method("POST", middleware.AuthMiddleware(handlers.BaseBatchDelete, "admin")))

    // Base sections
    mux.HandleFunc("/api/base-section/create", method("POST", middleware.AuthMiddleware(handlers.BaseSectionCreate, "admin")))
    mux.HandleFunc("/api/base-section/list", method("GET", middleware.AuthMiddleware(handlers.BaseSectionList, "admin")))
    mux.HandleFunc("/api/base-section/get", method("GET", middleware.AuthMiddleware(handlers.BaseSectionGet, "admin")))
    mux.HandleFunc("/api/base-section/update", method("PUT", middleware.AuthMiddleware(handlers.BaseSectionUpdate, "admin")))
    mux.HandleFunc("/api/base-section/delete", method("DELETE", middleware.AuthMiddleware(handlers.BaseSectionDelete, "admin")))

    // Users
    mux.HandleFunc("/api/user/create", method("POST", middleware.AuthMiddleware(handlers.UserCreate, "admin")))
    mux.HandleFunc("/api/user/list", method("GET", middleware.AuthMiddleware(handlers.UserList, "admin")))
    mux.HandleFunc("/api/user/get", method("GET", middleware.AuthMiddleware(handlers.UserGet, "admin")))
    mux.HandleFunc("/api/user/update", method("PUT", middleware.AuthMiddleware(handlers.UserUpdate, "admin")))
    mux.HandleFunc("/api/user/delete", method("DELETE", middleware.AuthMiddleware(handlers.UserDelete, "admin")))
    mux.HandleFunc("/api/user/batch-delete", method("POST", middleware.AuthMiddleware(handlers.UserBatchDelete, "admin")))
    mux.HandleFunc("/api/user/reset-password", method("POST", middleware.AuthMiddleware(handlers.UserResetPassword, "admin")))

    return mux
}

func method(m string, h http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != m {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        h(w, r)
    }
}
