@echo off
echo 设置环境变量...
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4^&parseTime=true^&loc=Local
set JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET

echo 启动后端服务...
cd backend
backend.exe