-- 重新创建用户基地关联表以优化多对多关系

-- 1. 创建新的用户基地关联表
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
    INDEX idx_base_id (base_id),
    INDEX idx_user_base (user_id, base_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 验证表结构
DESCRIBE user_bases;

-- 3. 验证现有数据
SELECT COUNT(*) as user_base_count FROM user_bases;

-- 4. 验证关联数据示例
SELECT 
    u.name as user_name, 
    b.name as base_name,
    ub.created_at
FROM user_bases ub
JOIN users u ON ub.user_id = u.id
JOIN bases b ON ub.base_id = b.id
ORDER BY u.name, b.name
LIMIT 10;