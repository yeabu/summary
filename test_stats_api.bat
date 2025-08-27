@echo off
echo 测试统计API...

echo.
echo 1. 先获取管理员token...
curl -s -X POST http://localhost:8080/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"admin\",\"password\":\"admin123456\"}" ^
  -o admin_token.json

echo 解析token...
for /f "tokens=2 delims=:" %%i in ('findstr "token" admin_token.json') do set ADMIN_TOKEN=%%i
set ADMIN_TOKEN=%ADMIN_TOKEN:"=%
set ADMIN_TOKEN=%ADMIN_TOKEN:,=%

echo.
echo 2. 测试统计API (2025-08)...
curl -s -X GET "http://localhost:8080/api/expense/stats?month=2025-08" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -o stats_result.json

echo 统计API返回结果:
type stats_result.json

echo.
echo 3. 测试其他月份 (2025-07)...
curl -s -X GET "http://localhost:8080/api/expense/stats?month=2025-07" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -o stats_2025_07.json

echo 2025-07月份统计结果:
type stats_2025_07.json

echo.
echo 清理临时文件...
del admin_token.json stats_result.json stats_2025_07.json >nul 2>&1

echo.
echo 测试完成！
pause