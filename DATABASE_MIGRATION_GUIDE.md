# 数据库迁移指南

## 概述
本文档说明如何将MySQL数据库中的base_expenses表从使用category字符串字段迁移到使用category_id外键字段，关联到新的expense_categories表。

## 迁移目标
1. 创建独立的expense_categories表来管理费用类别
2. 在base_expenses表中添加category_id字段
3. 建立base_expenses.category_id到expense_categories.id的外键关系
4. 迁移现有数据从category字段到category_id字段

## 执行步骤

### 1. 准备工作
在执行迁移之前，请务必备份数据库：
```bash
mysqldump -u [username] -p [database_name] > backup_before_migration.sql
```

### 2. 执行迁移脚本
有两种方式执行迁移：

#### 方式一：使用SQL脚本直接执行
```sql
-- 1. 创建expense_categories表
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 插入默认费用类别
INSERT IGNORE INTO expense_categories (name, code, status) VALUES 
('伙食费', 'FOOD', 'active'),
('修车费', 'REPAIR', 'active'),
('电费', 'ELECTRICITY', 'active'),
('加油费', 'FUEL', 'active'),
('材料费', 'MATERIAL', 'active');

-- 3. 添加category_id列
ALTER TABLE base_expenses 
ADD COLUMN IF NOT EXISTS category_id INT AFTER category;

-- 4. 更新category_id字段值
UPDATE base_expenses be
JOIN expense_categories ec ON be.category = ec.name
SET be.category_id = ec.id
WHERE be.category IS NOT NULL AND be.category != '' AND be.category_id IS NULL;

-- 5. 添加外键约束
ALTER TABLE base_expenses 
ADD CONSTRAINT IF NOT EXISTS fk_base_expenses_category_id 
FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;

-- 6. 添加索引
CREATE INDEX IF NOT EXISTS idx_base_expenses_category_id ON base_expenses(category_id);
```

#### 方式二：使用Go程序执行
```bash
cd c:\Users\Administrator\CodeBuddy\Projects\summary\backend
go run run_migration.go
```

### 3. 验证迁移结果
执行以下查询验证迁移是否成功：

```sql
-- 检查表结构
DESCRIBE base_expenses;
DESCRIBE expense_categories;

-- 检查数据迁移情况
SELECT 
    COUNT(*) as total_expenses,
    COUNT(category_id) as expenses_with_category_id,
    COUNT(category) as expenses_with_category
FROM base_expenses;

-- 检查类别关联情况
SELECT 
    ec.name as category_name,
    COUNT(be.id) as expense_count
FROM expense_categories ec
LEFT JOIN base_expenses be ON be.category_id = ec.id
GROUP BY ec.id, ec.name
ORDER BY expense_count DESC;
```

### 4. 清理（可选）
在确认迁移成功且应用程序正常工作后，可以删除旧的category字段：

```sql
ALTER TABLE base_expenses DROP COLUMN category;
```

## 回滚方案
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

## 注意事项
1. 迁移过程中可能会有短暂的服务中断，建议在维护窗口期间执行
2. 确保应用程序代码已更新以支持新的表结构
3. 在生产环境中执行迁移前，务必在测试环境中进行充分测试
4. 迁移后应监控应用程序的性能和功能是否正常

## 常见问题及解决方案

### 问题1：外键约束添加失败
**原因**：category_id字段中存在无法匹配到expense_categories表的值
**解决方案**：
```sql
-- 查找无法匹配的记录
SELECT category, COUNT(*) as count
FROM base_expenses 
WHERE category IS NOT NULL 
  AND category != '' 
  AND category NOT IN (SELECT name FROM expense_categories)
GROUP BY category;

-- 为这些类别创建记录
INSERT IGNORE INTO expense_categories (name, status) 
SELECT DISTINCT category, 'active' 
FROM base_expenses 
WHERE category IS NOT NULL 
  AND category != '' 
  AND category NOT IN (SELECT name FROM expense_categories);
```

### 问题2：迁移后数据显示不正确
**原因**：前端或后端代码未更新以使用新的category_id字段
**解决方案**：
1. 检查后端API是否正确返回category_id和关联的category信息
2. 检查前端是否正确显示category信息
3. 确保预加载了category关联数据

## 相关文件
- [update_base_expenses_table.sql](file:///c:/Users/Administrator/CodeBuddy/Projects/summary/database_migration/update_base_expenses_table.sql) - SQL迁移脚本
- [run_migration.go](file:///c:/Users/Administrator/CodeBuddy/Projects/summary/backend/run_migration.go) - Go程序执行迁移
- [backend/models/base_expense.go](file:///c:/Users/Administrator/CodeBuddy/Projects/summary/backend/models/base_expense.go) - 后端模型
- [backend/models/expense_category.go](file:///c:/Users/Administrator/CodeBuddy/Projects/summary/backend/models/expense_category.go) - 费用类别模型