ALTER TABLE purchase_entry_items
  ADD COLUMN IF NOT EXISTS unit VARCHAR(32) NULL AFTER product_name,
  ADD COLUMN IF NOT EXISTS quantity_base DECIMAL(18,6) NULL AFTER amount;

