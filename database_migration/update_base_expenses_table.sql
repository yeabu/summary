-- 数据库迁移脚本：将base_expenses表中的category字段替换为category_id
-- 执行前请务必备份数据库

-- 1. 创建expense_categories表（如果尚未存在）
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 向expense_categories表中插入默认类别（如果表为空）
INSERT IGNORE INTO expense_categories (name, code, status) VALUES 
('伙食费', 'FOOD', 'active'),
('修车费', 'REPAIR', 'active'),
('电费', 'ELECTRICITY', 'active'),
('加油费', 'FUEL', 'active'),
('材料费', 'MATERIAL', 'active');

-- 3. 添加category_id列到base_expenses表（如果尚未存在）
ALTER TABLE base_expenses 
ADD COLUMN IF NOT EXISTS category_id INT AFTER category;

-- 4. 更新category_id列的值（基于现有的category文本值）
UPDATE base_expenses be
JOIN expense_categories ec ON be.category = ec.name
SET be.category_id = ec.id
WHERE be.category IS NOT NULL AND be.category != '' AND be.category_id IS NULL;

-- 5. 为category_id列添加外键约束（如果尚未存在）
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'base_expenses' 
    AND CONSTRAINT_NAME = 'fk_base_expenses_category_id'
);

SET @sql = IF(
    @constraint_exists = 0,
    'ALTER TABLE base_expenses ADD CONSTRAINT fk_base_expenses_category_id FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL',
    'SELECT "Constraint already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. 添加索引以提高查询性能（如果尚未存在）
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'base_expenses' 
    AND INDEX_NAME = 'idx_base_expenses_category_id'
);

SET @sql = IF(
    @index_exists = 0,
    'CREATE INDEX idx_base_expenses_category_id ON base_expenses(category_id)',
    'SELECT "Index already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. 验证迁移结果
SELECT 
    COUNT(*) as total_expenses,
    COUNT(category_id) as expenses_with_category_id,
    COUNT(category) as expenses_with_category
FROM base_expenses;

SELECT 
    ec.name as category_name,
    COUNT(be.id) as expense_count
FROM expense_categories ec
LEFT JOIN base_expenses be ON be.category_id = ec.id
GROUP BY ec.id, ec.name
ORDER BY expense_count DESC;