# 数据库优化计划执行脚本
Write-Host "正在执行数据库优化计划..." -ForegroundColor Green

# 切换到项目根目录
Set-Location "c:\Users\Administrator\CodeBuddy\Projects\summary"

Write-Host "`n步骤1: 执行数据库迁移脚本..." -ForegroundColor Yellow
try {
    # 检查MySQL命令是否可用
    $mysqlAvailable = Get-Command mysql -ErrorAction SilentlyContinue
    if (-not $mysqlAvailable) {
        Write-Host "警告: MySQL命令不可用，跳过SQL脚本执行" -ForegroundColor Yellow
        Write-Host "请手动执行以下脚本: database_migration/ensure_complete_user_bases_relationship.sql" -ForegroundColor Cyan
    } else {
        # 使用输入重定向方式执行SQL脚本
        $sqlScriptPath = "database_migration/ensure_complete_user_bases_relationship.sql"
        mysql -u root -p123456 expense_tracker --execute="source $sqlScriptPath"
        Write-Host "数据库迁移脚本执行完成!" -ForegroundColor Green
    }
} catch {
    Write-Host "错误: 数据库迁移脚本执行失败" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    # 继续执行后续步骤而不是退出
}

Write-Host "`n步骤2: 编译并运行验证程序..." -ForegroundColor Yellow
try {
    # 切换到database_migration目录并执行Go程序
    Push-Location database_migration
    # 确保Go模块依赖已下载
    go mod tidy
    go run verify_user_bases_relationship.go
    Pop-Location
    Write-Host "验证程序执行完成!" -ForegroundColor Green
} catch {
    Write-Host "错误: 验证程序执行失败" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Pop-Location  # 确保返回原目录
}

Write-Host "`n优化计划执行完成!" -ForegroundColor Green

Write-Host "`n请手动执行以下SQL查询来验证结果:" -ForegroundColor Yellow
Write-Host "1. 检查users表结构:" -ForegroundColor Cyan
Write-Host "   DESCRIBE users;" -ForegroundColor White
Write-Host "2. 检查user_bases表结构:" -ForegroundColor Cyan
Write-Host "   DESCRIBE user_bases;" -ForegroundColor White
Write-Host "3. 检查user_bases表索引:" -ForegroundColor Cyan
Write-Host "   SHOW INDEX FROM user_bases;" -ForegroundColor White
Write-Host "4. 统计信息:" -ForegroundColor Cyan
Write-Host "   SELECT (SELECT COUNT(*) FROM user_bases) as total_associations, (SELECT COUNT(DISTINCT user_id) FROM user_bases) as unique_users, (SELECT COUNT(DISTINCT base_id) FROM user_bases) as unique_bases;" -ForegroundColor White

Write-Host "`n所有操作已完成!" -ForegroundColor Green
Write-Host "按任意键退出..."
#$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")