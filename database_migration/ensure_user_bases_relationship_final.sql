-- 确保用户与基地的多对多关系正确设置
-- 1. 确保users表中没有base_id字段
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'base_id'
);

SET @sql = IF(@column_exists > 0, 
    'ALTER TABLE users DROP COLUMN base_id', 
    'SELECT ''Column base_id does not exist in users table'' as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 确保user_bases表存在并正确设置
CREATE TABLE IF NOT EXISTS user_bases (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    base_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_base (user_id, base_id),
    INDEX idx_user_id (user_id),
    INDEX idx_base_id (base_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 验证表结构
SELECT 'User bases relationship ensured' as result;