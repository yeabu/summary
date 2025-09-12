@echo off
chcp 65001 >nul
echo 启动前端开发服务器...
echo 当前目录: %cd%

cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\react-app"
echo 切换到前端目录: %cd%

echo 检查依赖安装状态...
if not exist "node_modules" (
    echo 安装依赖...
    npm install
)

echo 启动前端服务...
npm run dev

pause