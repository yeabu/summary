@echo off
echo 清理冗余的base字段
echo 警告：此操作不可逆！请确保已经备份数据库！

cd /d %~dp0

echo 设置Go代理...
set GOPROXY=https://goproxy.cn,direct

echo 设置数据库连接...
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4^&parseTime=True^&loc=Local

echo 执行清理脚本...
go run cleanup_redundant_base_fields.go

if errorlevel 1 (
    echo 清理失败！请检查错误信息。
    pause
    exit /b 1
) else (
    echo 清理成功完成！
    pause
)