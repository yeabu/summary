@echo off
echo 正在验证数据库数据...
cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\backend"

REM 设置环境变量
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4^&parseTime=True^&loc=Local
set JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET

echo 运行数据验证程序...
go run tools/verify_data.go

echo.
pause