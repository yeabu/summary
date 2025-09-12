-- 优化user_bases表以提高多对多关系的查询性能

-- 1. 确保表存在并具有正确的结构
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
    INDEX idx_user_base_combined (user_id, base_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 检查表结构
DESCRIBE user_bases;

-- 3. 统计记录数
SELECT COUNT(*) as total_records FROM user_bases;

-- 4. 检查是否有重复关联
SELECT user_id, base_id, COUNT(*) as count
FROM user_bases
GROUP BY user_id, base_id
HAVING COUNT(*) > 1;

-- 5. 检查孤立记录（关联的用户或基地不存在）
SELECT ub.id, ub.user_id, ub.base_id
FROM user_bases ub
LEFT JOIN users u ON ub.user_id = u.id
LEFT JOIN bases b ON ub.base_id = b.id
WHERE u.id IS NULL OR b.id IS NULL;

-- 6. 显示前10条关联记录
SELECT 
    ub.id,
    u.name as user_name,
    b.name as base_name,
    ub.created_at,
    ub.updated_at
FROM user_bases ub
JOIN users u ON ub.user_id = u.id
JOIN bases b ON ub.base_id = b.id
ORDER BY ub.created_at DESC
LIMIT 10;