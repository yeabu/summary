-- 040: additional covering indexes for frequent queries

-- Suppliers name index to speed up LIKE 'prefix%'
ALTER TABLE suppliers ADD INDEX IF NOT EXISTS idx_sup_name (name);

-- Purchase entries by order_number
ALTER TABLE purchase_entries ADD INDEX IF NOT EXISTS idx_pe_order (order_number);

-- Payment records by payment_date
ALTER TABLE payment_records ADD INDEX IF NOT EXISTS idx_pr_date (payment_date);

-- Payables by period fields
ALTER TABLE payable_records ADD INDEX IF NOT EXISTS idx_payable_period_month (period_month);
ALTER TABLE payable_records ADD INDEX IF NOT EXISTS idx_payable_period_half (period_half);

