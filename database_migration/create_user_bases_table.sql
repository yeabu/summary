-- 创建用户与基地关联表
CREATE TABLE IF NOT EXISTS user_bases (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    base_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 添加索引以提高查询性能
    INDEX idx_user_base (user_id, base_id),
    INDEX idx_user_id (user_id),
    INDEX idx_base_id (base_id),
    
    -- 添加外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
    
    -- 确保用户与基地的组合是唯一的
    UNIQUE KEY unique_user_base (user_id, base_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 验证表结构
DESCRIBE user_bases;

-- 显示表的索引信息
SHOW INDEX FROM user_bases;