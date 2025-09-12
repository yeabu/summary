# 数据库优化执行说明

由于自动执行遇到了一些问题，以下是手动执行数据库优化计划的详细步骤。

## 步骤1：执行数据库迁移脚本

### 方法一：使用MySQL客户端工具
1. 打开您的MySQL客户端工具（如phpMyAdmin、MySQL Workbench等）
2. 连接到expense_tracker数据库
3. 执行以下SQL脚本：
   - 文件路径：`database_migration/ensure_complete_user_bases_relationship.sql`

### 方法二：使用命令行（如果mysql命令可用）
```bash
cd c:\Users\Administrator\CodeBuddy\Projects\summary
mysql -u root -p123456 expense_tracker < database_migration/ensure_complete_user_bases_relationship.sql
```

## 步骤2：运行验证程序

### 确保Go环境已安装
1. 打开命令提示符（cmd）
2. 运行以下命令检查Go是否已安装：
   ```bash
   go version
   ```

### 运行验证程序
1. 切换到database_migration目录：
   ```bash
   cd c:\Users\Administrator\CodeBuddy\Projects\summary\database_migration
   ```
2. 确保Go模块依赖已下载：
   ```bash
   go mod tidy
   ```
3. 运行验证程序：
   ```bash
   go run verify_user_bases_relationship.go
   ```

## 步骤3：手动验证结果

使用您的MySQL客户端工具执行以下查询来验证结果：

### 1. 检查users表结构
```sql
DESCRIBE users;
```
确认users表中不再包含base_id字段。

### 2. 检查user_bases表结构
```sql
DESCRIBE user_bases;
```
确认user_bases表包含以下字段：
- id (主键)
- user_id (外键，关联users表)
- base_id (外键，关联bases表)
- created_at
- updated_at

### 3. 检查user_bases表索引
```sql
SHOW INDEX FROM user_bases;
```
确认存在以下索引：
- PRIMARY (id字段)
- unique_user_base (user_id和base_id的组合唯一索引)
- idx_user_id (user_id字段的索引)
- idx_base_id (base_id字段的索引)
- idx_user_base_combined (user_id和base_id的组合索引)

### 4. 统计信息
```sql
SELECT 
    (SELECT COUNT(*) FROM user_bases) as total_associations,
    (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users,
    (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;
```

### 5. 检查关联了多个基地的用户
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

### 6. 检查关联了多个用户的基地
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

## 故障排除

### 如果MySQL命令不可用
1. 确保MySQL已安装并正在运行
2. 将MySQL的bin目录添加到系统PATH环境变量中
3. 或者使用MySQL客户端工具手动执行SQL脚本

### 如果数据库连接失败
1. 确认MySQL服务正在运行
2. 确认数据库连接信息正确：
   - 用户名：root
   - 密码：123456
   - 数据库名：expense_tracker
   - 主机：localhost
   - 端口：3306
3. 如果连接信息不同，请修改验证程序中的DSN字符串

### 如果Go程序执行失败
1. 确保Go已正确安装
2. 确保网络连接正常（用于下载依赖）
3. 在database_migration目录下运行`go mod tidy`确保依赖已下载

## 预期结果

执行完这些操作后，您的系统应该满足以下要求：

1. **users表**中不再包含base_id字段
2. **user_bases表**正确设置，支持多对多关系：
   - 一个用户可以关联多个基地
   - 一个基地可以关联多个用户
3. **索引优化**确保查询性能
4. **数据一致性**得到验证和保证

如果您在执行过程中遇到任何问题，请联系技术支持。