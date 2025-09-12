-- 最终化category_id字段迁移
-- 将category_id字段修改为允许NULL值
ALTER TABLE base_expenses MODIFY COLUMN category_id INT UNSIGNED NULL;

-- 添加外键约束
ALTER TABLE base_expenses 
ADD CONSTRAINT fk_base_expenses_category_id 
FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;

-- 验证修改结果
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'base_expenses' 
AND COLUMN_NAME = 'category_id';

-- 检查外键约束
SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'base_expenses' 
AND REFERENCED_TABLE_NAME IS NOT NULL
AND COLUMN_NAME = 'category_id';

-- 显示类别统计
SELECT 
    ec.name as category_name,
    COUNT(be.id) as expense_count
FROM expense_categories ec
LEFT JOIN base_expenses be ON be.category_id = ec.id
GROUP BY ec.id, ec.name
ORDER BY expense_count DESC;