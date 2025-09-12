@echo off
echo 数据库清理脚本 - 删除旧的Base字段
echo 警告：此操作不可逆！请确保迁移已经成功完成！
echo 请手动执行以下 SQL 命令来删除旧字段：
echo.
echo ALTER TABLE base_expenses DROP COLUMN base;
echo ALTER TABLE purchase_entries DROP COLUMN base;
echo.
echo 请在数据库管理工具中执行这些命令。
pause