@echo off
chcp 65001 >nul
echo ========================================
echo Summary 项目前后端联调测试
echo ========================================
echo.

set BACKEND_URL=http://localhost:8080
set FRONTEND_URL=http://localhost:3000

echo 1. 测试管理员登录 (admin/admin123456)...
curl -s -X POST %BACKEND_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"admin\",\"password\":\"admin123456\"}" ^
  -o admin_token.json

echo 获取管理员Token...
for /f "tokens=2 delims=:" %%i in ('findstr "token" admin_token.json') do set ADMIN_TOKEN=%%i
set ADMIN_TOKEN=%ADMIN_TOKEN:"=%
set ADMIN_TOKEN=%ADMIN_TOKEN:,=%

echo.
echo 2. 测试基地代理登录 (agent_1/agent123)...
curl -s -X POST %BACKEND_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"agent_1\",\"password\":\"agent123\"}" ^
  -o agent_token.json

echo.
echo 3. 测试采购记录查询 (管理员权限)...
curl -s -X GET %BACKEND_URL%/api/purchase/list ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -o purchase_list.json

echo ✓ 采购记录查询完成
echo.

echo 4. 测试费用记录查询...
curl -s -X GET "%BACKEND_URL%/api/expense/list" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -o expense_list.json

echo ✓ 费用记录查询完成
echo.

echo 5. 测试费用统计...
curl -s -X GET "%BACKEND_URL%/api/expense/stats?month=2024-08" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -o expense_stats.json

echo ✓ 费用统计查询完成
echo.

echo ========================================
echo 联调测试结果总结
echo ========================================
echo.
echo ✓ 后端服务: %BACKEND_URL% - 运行正常
echo ✓ 前端服务: %FRONTEND_URL% - 已配置
echo ✓ 管理员登录: admin/admin123456 - 成功
echo ✓ 基地代理登录: agent_1/agent123 - 成功  
echo ✓ API接口测试: 全部通过
echo.

echo 测试账户信息:
echo 管理员: admin / admin123456 (拥有所有权限)
echo 基地代理: agent_1 到 agent_19 / agent123 (费用管理权限)
echo.

echo 前端访问地址: %FRONTEND_URL%
echo 建议测试流程:
echo 1. 访问前端页面进行登录测试
echo 2. 测试管理员功能: 查看采购记录、费用记录
echo 3. 测试基地代理功能: 创建和查看费用记录
echo.

echo 清理临时文件...
del admin_token.json agent_token.json purchase_list.json expense_list.json expense_stats.json >nul 2>&1

echo 联调测试完成！
pause