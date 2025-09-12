@echo off
echo API接口测试脚本
echo.

set BASE_URL=http://localhost:8080

echo 1. 测试登录接口...
curl -X POST %BASE_URL%/api/login ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"admin\",\"password\":\"admin123\"}"

echo.
echo.

echo 2. 测试获取采购记录（需要先登录获取token）...
echo curl -X GET %BASE_URL%/api/purchase/list ^
echo   -H "Authorization: Bearer YOUR_TOKEN"

echo.
echo 3. 测试获取费用记录...
echo curl -X GET "%BASE_URL%/api/expense/list?month=2024-08" ^
echo   -H "Authorization: Bearer YOUR_TOKEN"

echo.
echo 4. 测试创建费用记录...
echo curl -X POST %BASE_URL%/api/expense/create ^
echo   -H "Authorization: Bearer YOUR_TOKEN" ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"date\":\"2024-08-25\",\"category\":\"办公用品\",\"amount\":299.50,\"detail\":\"购买打印纸和文具\"}"

echo.
echo 5. 测试费用统计...
echo curl -X GET "%BASE_URL%/api/expense/stats?month=2024-08" ^
echo   -H "Authorization: Bearer YOUR_TOKEN"

echo.
echo 请先确保后端服务已启动（运行 start-backend.bat）
echo 然后从登录接口响应中复制token，替换上述命令中的 YOUR_TOKEN

pause