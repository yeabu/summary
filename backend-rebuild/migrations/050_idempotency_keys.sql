-- 050: idempotency keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `key` VARCHAR(128) NOT NULL,
  resource VARCHAR(64) NOT NULL,
  ref_id BIGINT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_idem_key (`key`)
);

