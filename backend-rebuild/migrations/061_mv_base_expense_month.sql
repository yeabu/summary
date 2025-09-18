-- 061: materialized view table for base monthly expense
CREATE TABLE IF NOT EXISTS mv_base_expense_month (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  base_id BIGINT UNSIGNED NOT NULL,
  month CHAR(7) NOT NULL,
  total_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mv_bem (base_id, month)
);

