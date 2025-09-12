# 数据库迁移说明

## 迁移目标
将base_expenses表中的category字符串字段替换为category_id外键字段，关联到新的expense_categories表。

## 迁移步骤

### 1. 创建expense_categories表
```sql
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. 插入默认费用类别
```sql
INSERT INTO expense_categories (name, code, status) VALUES 
('伙食费', 'FOOD', 'active'),
('修车费', 'REPAIR', 'active'),
('电费', 'ELECTRICITY', 'active'),
('加油费', 'FUEL', 'active'),
('材料费', 'MATERIAL', 'active');
```

### 3. 修改base_expenses表结构
```sql
-- 添加category_id列
ALTER TABLE base_expenses 
ADD COLUMN category_id INT AFTER category;

-- 添加外键约束
ALTER TABLE base_expenses 
ADD CONSTRAINT fk_base_expenses_category_id 
FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;

-- 添加索引
CREATE INDEX idx_base_expenses_category_id ON base_expenses(category_id);
```

### 4. 迁移数据
```sql
-- 更新category_id列的值（基于现有的category文本值）
UPDATE base_expenses be
JOIN expense_categories ec ON be.category = ec.name
SET be.category_id = ec.id
WHERE be.category IS NOT NULL AND be.category != '';
```

### 5. 清理（可选）
```sql
-- 在确认新结构正常工作后，可以删除旧的category列
ALTER TABLE base_expenses DROP COLUMN category;
```

## 回滚步骤
如果需要回滚迁移，请执行以下步骤：

### 1. 恢复category列
```sql
ALTER TABLE base_expenses 
ADD COLUMN category VARCHAR(50) AFTER category_id;
```

### 2. 恢复category列的值
```sql
UPDATE base_expenses be
JOIN expense_categories ec ON be.category_id = ec.id
SET be.category = ec.name
WHERE be.category_id IS NOT NULL;
```

### 3. 删除新结构
```sql
-- 删除外键约束
ALTER TABLE base_expenses 
DROP FOREIGN KEY fk_base_expenses_category_id;

-- 删除索引
DROP INDEX idx_base_expenses_category_id ON base_expenses;

-- 删除category_id列
ALTER TABLE base_expenses 
DROP COLUMN category_id;
```

## 验证迁移
迁移完成后，可以通过以下方式验证：

1. 检查expense_categories表是否创建成功
2. 检查base_expenses表是否包含category_id列
3. 验证外键约束是否正常工作
4. 确认数据是否正确迁移

## 注意事项
1. 在执行迁移之前，请务必备份数据库
2. 建议在测试环境中先进行迁移测试
3. 迁移过程中可能会有短暂的服务中断
4. 确保应用程序代码已更新以支持新的表结构