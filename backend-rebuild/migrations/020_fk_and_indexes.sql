-- 020: FKs and indexes for purchases, payables, links, payments
ALTER TABLE purchase_entries
  ADD INDEX IF NOT EXISTS idx_pe_supplier_base_date (supplier_id, base_id, purchase_date);

ALTER TABLE payable_records
  ADD INDEX IF NOT EXISTS idx_payable_supplier_base_status (supplier_id, base_id, status),
  ADD INDEX IF NOT EXISTS idx_payable_due_date (due_date);

ALTER TABLE payable_links
  ADD UNIQUE KEY IF NOT EXISTS uq_pl_payable_purchase (payable_record_id, purchase_entry_id);

ALTER TABLE payment_records
  ADD INDEX IF NOT EXISTS idx_pr_payable (payable_record_id);

