@echo off
echo 开始执行数据库迁移...
echo 注意：请确保已经备份了数据库！

cd /d %~dp0\..\..\database_migration

echo 设置Go代理...
set GOPROXY=https://goproxy.cn,direct

echo 下载依赖...
go mod tidy

echo 执行迁移脚本...
go run migrate_base_fields.go

if errorlevel 1 (
    echo 迁移失败！请检查错误信息。
    pause
    exit /b 1
) else (
    echo 迁移成功完成！
    pause
)