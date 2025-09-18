-- 060: materialized view table for supplier monthly spend
CREATE TABLE IF NOT EXISTS mv_supplier_monthly_spend (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  supplier_id BIGINT UNSIGNED NOT NULL,
  base_id BIGINT UNSIGNED NOT NULL,
  month CHAR(7) NOT NULL, -- YYYY-MM
  total_purchase DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_paid DECIMAL(18,4) NOT NULL DEFAULT 0,
  remaining DECIMAL(18,4) NOT NULL DEFAULT 0,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mv_sms (supplier_id, base_id, month)
);

