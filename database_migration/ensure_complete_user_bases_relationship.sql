-- 确保完整的用户与基地多对多关系设置

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

-- 2. 创建或更新user_bases表以支持多对多关系
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

-- 3. 验证表结构
DESCRIBE user_bases;

-- 4. 检查现有数据一致性
-- 检查是否有重复关联
SELECT 'Checking for duplicate associations...' as info;
SELECT user_id, base_id, COUNT(*) as count
FROM user_bases
GROUP BY user_id, base_id
HAVING COUNT(*) > 1;

-- 检查孤立记录
SELECT 'Checking for orphaned records...' as info;
SELECT ub.id, ub.user_id, ub.base_id
FROM user_bases ub
LEFT JOIN users u ON ub.user_id = u.id
LEFT JOIN bases b ON ub.base_id = b.id
WHERE u.id IS NULL OR b.id IS NULL;

-- 5. 统计信息
SELECT 'Table statistics:' as info;
SELECT 
    (SELECT COUNT(*) FROM user_bases) as total_associations,
    (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users,
    (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;

-- 6. 显示样本数据
SELECT 'Sample associations:' as info;
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
LIMIT 5;

SELECT 'User bases relationship ensured and optimized' as result;