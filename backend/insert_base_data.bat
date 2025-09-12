@echo off
echo 正在插入基地数据...
cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\backend\tools"

REM 设置环境变量
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4^&parseTime=True^&loc=Local
set JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET

echo 环境变量已设置:
echo MYSQL_DSN=%MYSQL_DSN%
echo JWT_SECRET=%JWT_SECRET%

echo.
echo 正在执行数据插入...
go run insert_base_data.go

echo.
echo 数据插入完成！
pause