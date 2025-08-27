@echo off
echo 正在清理无效记录并生成测试数据...
cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\backend\tools"

REM 设置环境变量
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4^&parseTime=True^&loc=Local
set JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET

echo 环境变量已设置:
echo MYSQL_DSN=%MYSQL_DSN%
echo JWT_SECRET=%JWT_SECRET%

echo.
echo 正在执行数据清理和生成...
go run clean_and_generate_data.go

echo.
echo 数据清理和生成完成！
pause