-- 003: supplier product price history
CREATE TABLE IF NOT EXISTS supplier_product_prices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  supplier_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  currency VARCHAR(8) DEFAULT 'CNY',
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_spp_sp_from (supplier_id, product_id, effective_from),
  CONSTRAINT fk_spp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_spp_product FOREIGN KEY (product_id) REFERENCES products(id)
);

