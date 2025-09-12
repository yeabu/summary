@echo off
echo 开始测试数据库关联查询功能...

cd /d %~dp0

echo 设置Go代理...
set GOPROXY=https://goproxy.cn,direct

echo 设置数据库连接...
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4^&parseTime=True^&loc=Local

echo 执行测试脚本...
go run test_association.go

if errorlevel 1 (
    echo 测试失败！请检查错误信息。
    pause
    exit /b 1
) else (
    echo 测试成功完成！
    pause
)