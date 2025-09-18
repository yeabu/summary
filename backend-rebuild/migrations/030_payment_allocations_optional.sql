-- 030: optional split-payment allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  payable_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payalloc_payment FOREIGN KEY (payment_id) REFERENCES payment_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_payalloc_payable FOREIGN KEY (payable_id) REFERENCES payable_records(id) ON DELETE CASCADE
);

