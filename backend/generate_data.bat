@echo off
echo 正在生成测试数据...
cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\backend"

REM 设置环境变量
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4^&parseTime=True^&loc=Local
set JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET

echo 环境变量已设置
echo.

echo 运行测试数据生成器...
go run tools/generate_test_data.go

echo.
echo 测试数据生成完成！
pause