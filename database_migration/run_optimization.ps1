# 数据库优化执行脚本
Write-Host "开始执行数据库优化..." -ForegroundColor Green

# 切换到database_migration目录
Set-Location "c:\Users\Administrator\CodeBuddy\Projects\summary\database_migration"

Write-Host "`n步骤1: 更新Go模块依赖..." -ForegroundColor Yellow
go mod tidy

Write-Host "`n步骤2: 编译并运行优化程序..." -ForegroundColor Yellow
go run continue_optimization.go

if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 优化程序执行失败" -ForegroundColor Red
    exit 1
}

Write-Host "`n优化程序执行完成!" -ForegroundColor Green

Write-Host "`n步骤3: 执行验证查询..." -ForegroundColor Yellow

# 检查MySQL命令是否可用
$mysqlAvailable = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlAvailable) {
    Write-Host "警告: MySQL命令不可用，跳过SQL验证查询" -ForegroundColor Yellow
    Write-Host "请手动执行以下查询来验证结果:" -ForegroundColor Cyan
    Write-Host "1. 检查user_bases表结构:" -ForegroundColor White
    Write-Host "   DESCRIBE user_bases;" -ForegroundColor White
    Write-Host "2. 检查user_bases表索引:" -ForegroundColor White
    Write-Host "   SHOW INDEX FROM user_bases;" -ForegroundColor White
    Write-Host "3. 统计信息:" -ForegroundColor White
    Write-Host "   SELECT (SELECT COUNT(*) FROM user_bases) as total_associations, (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users, (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;" -ForegroundColor White
} else {
    Write-Host "检查user_bases表结构..." -ForegroundColor Cyan
    mysql -u root -p123456 expense_tracker --execute="DESCRIBE user_bases;"
    
    Write-Host "`n检查user_bases表索引..." -ForegroundColor Cyan
    mysql -u root -p123456 expense_tracker --execute="SHOW INDEX FROM user_bases;"
    
    Write-Host "`n统计信息..." -ForegroundColor Cyan
    mysql -u root -p123456 expense_tracker --execute="SELECT (SELECT COUNT(*) FROM user_bases) as total_associations, (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users, (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;"
    
    Write-Host "`n检查关联了多个基地的用户..." -ForegroundColor Cyan
    mysql -u root -p123456 expense_tracker --execute="SELECT u.name as user_name, COUNT(ub.base_id) as base_count FROM users u JOIN user_bases ub ON u.id = ub.user_id GROUP BY u.id, u.name HAVING COUNT(ub.base_id) > 1 ORDER BY base_count DESC LIMIT 5;"
    
    Write-Host "`n检查关联了多个用户的基地..." -ForegroundColor Cyan
    mysql -u root -p123456 expense_tracker --execute="SELECT b.name as base_name, COUNT(ub.user_id) as user_count FROM bases b JOIN user_bases ub ON b.id = ub.base_id GROUP BY b.id, b.name HAVING COUNT(ub.user_id) > 1 ORDER BY user_count DESC LIMIT 5;"
}

Write-Host "`n所有优化操作已完成!" -ForegroundColor Green
Write-Host "按任意键退出..."
#$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")