-- 010: add product_id to purchase_entry_items and basic FKs
ALTER TABLE purchase_entry_items
  ADD COLUMN IF NOT EXISTS product_id BIGINT UNSIGNED NULL AFTER purchase_entry_id;

ALTER TABLE purchase_entry_items
  ADD INDEX IF NOT EXISTS idx_pei_product (product_id);

ALTER TABLE purchase_entry_items
  ADD CONSTRAINT fk_pei_product FOREIGN KEY (product_id) REFERENCES products(id);

