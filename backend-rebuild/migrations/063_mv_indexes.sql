-- 063: recommended indexes for MV tables
ALTER TABLE mv_supplier_monthly_spend
  ADD INDEX IF NOT EXISTS idx_mv_sms_month (month),
  ADD INDEX IF NOT EXISTS idx_mv_sms_month_base (month, base_id);

ALTER TABLE mv_base_expense_month
  ADD INDEX IF NOT EXISTS idx_mv_bem_month (month);

