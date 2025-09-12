# 数据库变更记录

## 变更概述
向base_expenses表添加category_id列，用于关联expense_categories表，实现费用类别的外键关联。

## 变更详情

### 1. 添加category_id列
- **表名**: base_expenses
- **列名**: category_id
- **数据类型**: INT
- **是否可为空**: YES
- **默认值**: NULL
- **位置**: 在category列之后

### 2. 创建expense_categories表
- **表名**: expense_categories
- **字段**:
  - id: INT, PRIMARY KEY, AUTO_INCREMENT
  - name: VARCHAR(50), NOT NULL, UNIQUE
  - code: VARCHAR(20), UNIQUE
  - status: VARCHAR(20), DEFAULT 'active'
  - created_at: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP
  - updated_at: TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 3. 插入默认费用类别
- 伙食费 (FOOD)
- 修车费 (REPAIR)
- 电费 (ELECTRICITY)
- 加油费 (FUEL)
- 材料费 (MATERIAL)

### 4. 数据迁移
将base_expenses表中现有的category文本值转换为对应的category_id外键值。

### 5. 添加外键约束
- **约束名**: fk_base_expenses_category_id
- **父表**: expense_categories
- **子表**: base_expenses
- **列**: category_id -> id
- **删除规则**: ON DELETE SET NULL

### 6. 添加索引
- **索引名**: idx_base_expenses_category_id
- **表**: base_expenses
- **列**: category_id

## 执行步骤

### 1. 备份数据库
```bash
mysqldump -u [username] -p [database_name] > backup_before_category_id_change.sql
```

### 2. 执行SQL脚本
```sql
-- 添加category_id列
ALTER TABLE base_expenses 
ADD COLUMN category_id INT NULL AFTER category;

-- 创建expense_categories表
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 插入默认费用类别
INSERT IGNORE INTO expense_categories (name, code, status) VALUES 
('伙食费', 'FOOD', 'active'),
('修车费', 'REPAIR', 'active'),
('电费', 'ELECTRICITY', 'active'),
('加油费', 'FUEL', 'active'),
('材料费', 'MATERIAL', 'active');

-- 更新category_id字段值
UPDATE base_expenses be
JOIN expense_categories ec ON be.category = ec.name
SET be.category_id = ec.id
WHERE be.category IS NOT NULL AND be.category != '' AND be.category_id IS NULL;

-- 添加外键约束
ALTER TABLE base_expenses 
ADD CONSTRAINT fk_base_expenses_category_id 
FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;

-- 添加索引
CREATE INDEX idx_base_expenses_category_id ON base_expenses(category_id);
```

### 3. 使用Go程序执行
```bash
cd c:\Users\Administrator\CodeBuddy\Projects\summary\backend
go run add_category_id_column.go
```

## 验证步骤

### 1. 检查表结构
```sql
DESCRIBE base_expenses;
DESCRIBE expense_categories;
```

### 2. 检查约束和索引
```sql
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'base_expenses'
AND REFERENCED_TABLE_NAME = 'expense_categories';

SHOW INDEX FROM base_expenses;
```

### 3. 验证数据迁移
```sql
SELECT 
    COUNT(*) as total_records,
    COUNT(category_id) as records_with_category_id,
    COUNT(CASE WHEN category_id IS NULL AND category IS NOT NULL AND category != '' THEN 1 END) as records_without_migration
FROM base_expenses;

SELECT 
    ec.name as category_name,
    COUNT(be.id) as expense_count
FROM expense_categories ec
LEFT JOIN base_expenses be ON be.category_id = ec.id
GROUP BY ec.id, ec.name
ORDER BY expense_count DESC;
```

## 回滚方案

如果需要回滚此变更，请执行以下步骤：

### 1. 删除外键约束
```sql
ALTER TABLE base_expenses 
DROP FOREIGN KEY fk_base_expenses_category_id;
```

### 2. 删除索引
```sql
DROP INDEX idx_base_expenses_category_id ON base_expenses;
```

### 3. 删除category_id列
```sql
ALTER TABLE base_expenses 
DROP COLUMN category_id;
```

### 4. 删除expense_categories表（可选）
```sql
DROP TABLE expense_categories;
```

## 注意事项
1. 在执行变更前务必备份数据库
2. 建议在测试环境中先进行测试
3. 变更过程中可能会有短暂的服务中断
4. 确保应用程序代码已更新以支持新的表结构
5. 如果有不匹配的category值，外键约束添加可能会失败，需要先清理数据