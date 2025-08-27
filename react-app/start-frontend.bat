@echo off
echo 正在启动React前端服务...
cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\react-app"

echo 当前目录: %CD%
echo.

echo 检查环境变量配置...
type .env
echo.

echo 安装依赖包...
npm install

echo.
echo 启动开发服务器...
npm run dev

pause