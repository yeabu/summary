@echo off
echo 正在执行数据库优化计划...

REM 切换到项目根目录
cd /d "c:\Users\Administrator\CodeBuddy\Projects\summary"

echo.
echo 步骤1: 执行数据库迁移脚本...
echo.

REM 使用PowerShell执行SQL脚本
powershell -Command "mysql -u root -p123456 expense_tracker < database_migration/ensure_complete_user_bases_relationship.sql"

if %errorlevel% neq 0 (
    echo 错误: 数据库迁移脚本执行失败
    pause
    exit /b 1
)

echo.
echo 步骤2: 编译并运行验证程序...
echo.

REM 编译并运行Go验证程序
go run database_migration/verify_user_bases_relationship.go

if %errorlevel% neq 0 (
    echo 错误: 验证程序执行失败
    pause
    exit /b 1
)

echo.
echo 步骤3: 执行SQL验证查询...
echo.

REM 执行验证查询
powershell -Command "mysql -u root -p123456 expense_tracker -e \"DESCRIBE users;\""
powershell -Command "mysql -u root -p123456 expense_tracker -e \"DESCRIBE user_bases;\""
powershell -Command "mysql -u root -p123456 expense_tracker -e \"SHOW INDEX FROM user_bases;\""
powershell -Command "mysql -u root -p123456 expense_tracker -e \"SELECT (SELECT COUNT(*) FROM user_bases) as total_associations, (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users, (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;\""

echo.
echo 优化计划执行完成!
echo.

REM 检查是否有关联了多个基地的用户
echo 检查关联了多个基地的用户...
powershell -Command "mysql -u root -p123456 expense_tracker -e \"SELECT u.name as user_name, COUNT(ub.base_id) as base_count FROM users u JOIN user_bases ub ON u.id = ub.user_id GROUP BY u.id, u.name HAVING COUNT(ub.base_id) > 1 ORDER BY base_count DESC LIMIT 5;\""

echo.
echo 检查关联了多个用户的基地...
powershell -Command "mysql -u root -p123456 expense_tracker -e \"SELECT b.name as base_name, COUNT(ub.user_id) as user_count FROM bases b JOIN user_bases ub ON b.id = ub.base_id GROUP BY b.id, b.name HAVING COUNT(ub.user_id) > 1 ORDER BY user_count DESC LIMIT 5;\""

echo.
echo 所有操作已完成!
pause