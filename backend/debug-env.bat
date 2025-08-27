@echo off
echo 正在调试环境变量和数据库连接...
cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\backend"

echo.
echo 1. 检查 .env 文件是否存在...
if exist .env (
    echo ✓ .env 文件存在
    echo 内容:
    type .env
) else (
    echo ✗ .env 文件不存在
)

echo.
echo 2. 检查当前环境变量...
echo MYSQL_DSN=%MYSQL_DSN%
echo JWT_SECRET=%JWT_SECRET%

echo.
echo 3. 尝试运行Go程序...
go run .

pause