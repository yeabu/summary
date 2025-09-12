@echo off
echo ========================================
echo Summary 项目前后端联调测试
echo ========================================
echo.

set BACKEND_URL=http://localhost:8080
set FRONTEND_URL=http://localhost:3000

echo 1. 检查后端服务状态...
curl -s %BACKEND_URL%/api/login -o nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ 后端服务运行正常
) else (
    echo ✗ 后端服务未启动，请先运行 start-backend.bat
    echo.
    pause
    exit /b 1
)

echo.
echo 2. 测试管理员登录...
echo 用户名: admin
echo 密码: admin123456

curl -X POST %BACKEND_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"admin\",\"password\":\"admin123456\"}" ^
  -o login_response.json

if %ERRORLEVEL% EQU 0 (
    echo ✓ 登录请求发送成功
    echo 响应内容:
    type login_response.json
    echo.
) else (
    echo ✗ 登录请求失败
)

echo.
echo 3. 检查前端服务状态...
curl -s %FRONTEND_URL% -o nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ 前端服务运行正常
) else (
    echo ✗ 前端服务未启动，请先运行 start-frontend.bat
)

echo.
echo 4. 测试基地代理登录...
echo 用户名: agent_1
echo 密码: agent123

curl -X POST %BACKEND_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"agent_1\",\"password\":\"agent123\"}" ^
  -o agent_login_response.json

if %ERRORLEVEL% EQU 0 (
    echo ✓ 基地代理登录请求发送成功
    echo 响应内容:
    type agent_login_response.json
    echo.
) else (
    echo ✗ 基地代理登录请求失败
)

echo.
echo 5. 服务地址信息...
echo 前端地址: %FRONTEND_URL%
echo 后端API: %BACKEND_URL%
echo.

echo 6. 测试账户信息...
echo 管理员账户: admin / admin123456
echo 基地代理账户: agent_1 到 agent_19 / agent123
echo.

echo 7. 主要API接口...
echo POST %BACKEND_URL%/api/login - 用户登录
echo GET  %BACKEND_URL%/api/purchase/list - 查询采购记录 (admin)
echo GET  %BACKEND_URL%/api/expense/list - 查询费用记录
echo POST %BACKEND_URL%/api/expense/create - 创建费用记录 (base_agent)
echo GET  %BACKEND_URL%/api/expense/stats?month=2024-08 - 费用统计
echo.

echo ========================================
echo 联调测试完成！
echo ========================================
echo.
echo 测试建议:
echo 1. 打开浏览器访问: %FRONTEND_URL%
echo 2. 使用 admin/admin123456 登录测试管理员功能
echo 3. 使用 agent_1/agent123 登录测试基地代理功能
echo 4. 检查前端是否能正确调用后端API
echo.

echo 清理临时文件...
if exist login_response.json del login_response.json
if exist agent_login_response.json del agent_login_response.json

pause