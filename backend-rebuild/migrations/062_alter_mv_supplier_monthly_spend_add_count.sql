-- 062: add purchase_count to mv_supplier_monthly_spend
ALTER TABLE mv_supplier_monthly_spend
  ADD COLUMN IF NOT EXISTS purchase_count BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER total_purchase;

