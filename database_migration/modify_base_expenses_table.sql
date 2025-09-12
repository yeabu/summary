-- 修改base_expenses表，将category字段替换为category_id
-- 注意：在执行此脚本之前，请务必备份数据库

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
INSERT INTO expense_categories (name, code, status) 
SELECT '伙食费', 'FOOD', 'active' 
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = '伙食费');

INSERT INTO expense_categories (name, code, status) 
SELECT '修车费', 'REPAIR', 'active' 
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = '修车费');

INSERT INTO expense_categories (name, code, status) 
SELECT '电费', 'ELECTRICITY', 'active' 
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = '电费');

INSERT INTO expense_categories (name, code, status) 
SELECT '加油费', 'FUEL', 'active' 
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = '加油费');

INSERT INTO expense_categories (name, code, status) 
SELECT '材料费', 'MATERIAL', 'active' 
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = '材料费');

-- 3. 添加category_id列到base_expenses表
ALTER TABLE base_expenses 
ADD COLUMN category_id INT AFTER category;

-- 4. 更新category_id列的值（基于现有的category文本值）
UPDATE base_expenses be
JOIN expense_categories ec ON be.category = ec.name
SET be.category_id = ec.id
WHERE be.category IS NOT NULL AND be.category != '';

-- 5. 为category_id列添加外键约束
ALTER TABLE base_expenses 
ADD CONSTRAINT fk_base_expenses_category_id 
FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;

-- 6. 删除旧的category列
-- 注意：在确认新结构正常工作之前，建议先保留此列
-- ALTER TABLE base_expenses DROP COLUMN category;

-- 7. 添加索引以提高查询性能
CREATE INDEX idx_base_expenses_category_id ON base_expenses(category_id);