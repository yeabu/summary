# 数据库优化执行指南

本指南将帮助您执行数据库优化计划，确保user_bases表正确设置以支持用户与基地之间的多对多关系。

## 执行步骤

### 方法一：使用PowerShell脚本（推荐）

1. 打开PowerShell作为管理员
2. 导航到脚本目录：
   ```powershell
   cd c:\Users\Administrator\CodeBuddy\Projects\summary\database_migration
   ```
3. 执行脚本：
   ```powershell
   .\execute_optimization_plan.ps1
   ```

### 方法二：手动执行

#### 步骤1：执行数据库迁移脚本

使用您的数据库管理工具（如phpMyAdmin、MySQL Workbench）执行以下SQL脚本：
- 文件路径：`database_migration/ensure_complete_user_bases_relationship.sql`

或者使用命令行：
```bash
mysql -u root -p123456 expense_tracker < database_migration/ensure_complete_user_bases_relationship.sql
```

#### 步骤2：编译并运行验证程序

在项目根目录下执行：
```bash
cd c:\Users\Administrator\CodeBuddy\Projects\summary
go run database_migration/verify_user_bases_relationship.go
```

#### 步骤3：执行SQL验证查询

使用您的数据库管理工具执行以下查询：

1. 检查users表结构：
   ```sql
   DESCRIBE users;
   ```

2. 检查user_bases表结构：
   ```sql
   DESCRIBE user_bases;
   ```

3. 检查user_bases表索引：
   ```sql
   SHOW INDEX FROM user_bases;
   ```

4. 统计信息：
   ```sql
   SELECT 
       (SELECT COUNT(*) FROM user_bases) as total_associations,
       (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users,
       (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;
   ```

5. 检查关联了多个基地的用户：
   ```sql
   SELECT 
       u.name as user_name,
       COUNT(ub.base_id) as base_count
   FROM users u
   JOIN user_bases ub ON u.id = ub.user_id
   GROUP BY u.id, u.name
   HAVING COUNT(ub.base_id) > 1
   ORDER BY base_count DESC;
   ```

6. 检查关联了多个用户的基地：
   ```sql
   SELECT 
       b.name as base_name,
       COUNT(ub.user_id) as user_count
   FROM bases b
   JOIN user_bases ub ON b.id = ub.base_id
   GROUP BY b.id, b.name
   HAVING COUNT(ub.user_id) > 1
   ORDER BY user_count DESC;
   ```

## 预期结果

执行完这些操作后，您的系统应该满足以下要求：

1. **users表**中不再包含base_id字段
2. **user_bases表**正确设置，支持多对多关系：
   - 一个用户可以关联多个基地
   - 一个基地可以关联多个用户
3. **索引优化**确保查询性能：
   - PRIMARY (id字段)
   - unique_user_base (user_id和base_id的组合唯一索引)
   - idx_user_id (user_id字段的索引)
   - idx_base_id (base_id字段的索引)
   - idx_user_base_combined (user_id和base_id的组合索引)
4. **数据一致性**得到验证和保证

## 故障排除

如果在执行过程中遇到问题，请检查以下几点：

1. 确保MySQL服务正在运行
2. 确保数据库连接信息正确（用户名、密码、数据库名）
3. 确保Go环境已正确安装和配置
4. 确保有足够的权限执行数据库操作

如果仍有问题，请联系技术支持。