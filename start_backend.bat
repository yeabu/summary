@echo off
chcp 65001 >nul
echo 启动后端服务器...
echo 当前目录: %cd%

cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\backend"
echo 切换到后端目录: %cd%

echo 设置环境变量...
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4
set JWT_SECRET=my-secret-key-2024
set PORT=8080

echo 检查main.go文件...
if exist "main.go" (
    echo ✓ main.go 文件存在
) else (
    echo ✗ main.go 文件不存在
    pause
    exit /b 1
)

echo 编译并启动服务...
go run main.go

pause