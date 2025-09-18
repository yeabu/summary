-- 002: supplier products
CREATE TABLE IF NOT EXISTS supplier_products (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  supplier_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  default_unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) DEFAULT 'CNY',
  status ENUM('active','inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supplier_product (supplier_id, product_id),
  CONSTRAINT fk_sup_prod_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  CONSTRAINT fk_sup_prod_product FOREIGN KEY (product_id) REFERENCES products(id)
);

