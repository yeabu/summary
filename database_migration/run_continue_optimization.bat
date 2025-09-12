@echo off
echo 继续执行数据库优化...

REM 切换到项目根目录
cd /d "c:\Users\Administrator\CodeBuddy\Projects\summary"

echo.
echo 步骤1: 编译并运行优化程序...
echo.

REM 切换到database_migration目录
cd database_migration

REM 确保Go模块依赖已下载
go mod tidy

REM 运行优化程序
go run continue_optimization.go

if %errorlevel% neq 0 (
    echo 错误: 优化程序执行失败
    pause
    exit /b 1
)

echo.
echo 优化程序执行完成!
echo.

echo 步骤2: 验证优化结果...
echo.

REM 执行验证查询
echo 检查user_bases表结构...
mysql -u root -p123456 expense_tracker -e "DESCRIBE user_bases;"

echo.
echo 检查user_bases表索引...
mysql -u root -p123456 expense_tracker -e "SHOW INDEX FROM user_bases;"

echo.
echo 统计信息...
mysql -u root -p123456 expense_tracker -e "SELECT (SELECT COUNT(*) FROM user_bases) as total_associations, (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users, (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;"

echo.
echo 检查关联了多个基地的用户...
mysql -u root -p123456 expense_tracker -e "SELECT u.name as user_name, COUNT(ub.base_id) as base_count FROM users u JOIN user_bases ub ON u.id = ub.user_id GROUP BY u.id, u.name HAVING COUNT(ub.base_id) > 1 ORDER BY base_count DESC LIMIT 5;"

echo.
echo 检查关联了多个用户的基地...
mysql -u root -p123456 expense_tracker -e "SELECT b.name as base_name, COUNT(ub.user_id) as user_count FROM bases b JOIN user_bases ub ON b.id = ub.base_id GROUP BY b.id, b.name HAVING COUNT(ub.user_id) > 1 ORDER BY user_count DESC LIMIT 5;"

echo.
echo 所有优化操作已完成!
pause