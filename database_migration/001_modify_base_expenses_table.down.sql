-- 回滚迁移：将base_expenses表恢复到原始状态
-- 注意：在执行此脚本之前，请务必备份数据库

-- 1. 添加回category列（如果不存在）
ALTER TABLE base_expenses 
ADD COLUMN category VARCHAR(50) AFTER category_id;

-- 2. 恢复category列的值（基于category_id）
UPDATE base_expenses be
JOIN expense_categories ec ON be.category_id = ec.id
SET be.category = ec.name
WHERE be.category_id IS NOT NULL;

-- 3. 删除外键约束
ALTER TABLE base_expenses 
DROP FOREIGN KEY fk_base_expenses_category_id;

-- 4. 删除索引
DROP INDEX idx_base_expenses_category_id ON base_expenses;

-- 5. 删除category_id列
ALTER TABLE base_expenses 
DROP COLUMN category_id;

-- 6. 删除expense_categories表（可选，根据需要决定是否删除）
-- 注意：如果其他地方也在使用此表，请不要删除
-- DROP TABLE expense_categories;

-- 7. 删除迁移完成标记（可选）
-- DELETE FROM migration_log WHERE migration_name = '001_modify_base_expenses_table';