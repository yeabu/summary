-- 向base_expenses表添加category_id列
-- 执行前请务必备份数据库

-- 1. 检查category_id列是否已存在，如果不存在则添加
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'base_expenses' 
    AND column_name = 'category_id'
);

SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE base_expenses ADD COLUMN category_id INT UNSIGNED NULL AFTER category',
    'SELECT "Column category_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 创建expense_categories表（如果尚未存在）
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. 向expense_categories表中插入默认类别（如果表为空）
INSERT IGNORE INTO expense_categories (name, code, status) VALUES 
('伙食费', 'FOOD', 'active'),
('修车费', 'REPAIR', 'active'),
('电费', 'ELECTRICITY', 'active'),
('加油费', 'FUEL', 'active'),
('材料费', 'MATERIAL', 'active');

-- 4. 更新base_expenses表中的category_id字段值（基于现有的category文本值）
UPDATE base_expenses be
JOIN expense_categories ec ON be.category = ec.name
SET be.category_id = ec.id
WHERE be.category IS NOT NULL AND be.category != '' AND be.category_id IS NULL;

-- 5. 检查外键约束是否已存在，如果不存在则添加
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
    'SELECT "Constraint fk_base_expenses_category_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. 检查索引是否已存在，如果不存在则添加
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
    'SELECT "Index idx_base_expenses_category_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. 检查category列是否仍然存在，如果存在则删除
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'base_expenses' 
    AND column_name = 'category'
);

SET @sql = IF(
    @column_exists > 0,
    'ALTER TABLE base_expenses DROP COLUMN category',
    'SELECT "Column category does not exist" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. 验证修改结果
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'base_expenses' 
AND COLUMN_NAME IN ('category_id', 'category');

-- 9. 验证数据迁移情况
SELECT 
    COUNT(*) as total_records,
    COUNT(category_id) as records_with_category_id,
    COUNT(CASE WHEN category_id IS NULL THEN 1 END) as records_without_category_id
FROM base_expenses;

-- 10. 显示类别统计
SELECT 
    ec.name as category_name,
    COUNT(be.id) as expense_count
FROM expense_categories ec
LEFT JOIN base_expenses be ON be.category_id = ec.id
GROUP BY ec.id, ec.name
ORDER BY expense_count DESC;