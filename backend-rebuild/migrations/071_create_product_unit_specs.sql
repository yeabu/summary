CREATE TABLE IF NOT EXISTS product_unit_specs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  unit VARCHAR(32) NOT NULL,
  factor_to_base DECIMAL(18,6) NOT NULL,
  kind ENUM('purchase','usage','both') DEFAULT 'both',
  is_default TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_prod_unit (product_id, unit),
  KEY idx_prod_unit_kind (product_id, kind),
  CONSTRAINT fk_pus_product FOREIGN KEY (product_id) REFERENCES products(id)
);

