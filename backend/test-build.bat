@echo off
echo 正在测试Go项目编译...
cd /d "C:\Users\Administrator\CodeBuddy\Projects\summary\backend"

echo.
echo 1. 检查Go模块...
go mod tidy

echo.
echo 2. 尝试编译项目...
go build -v .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ 编译成功！
    echo 项目已成功修复循环导入问题。
) else (
    echo.
    echo ✗ 编译失败，错误代码: %ERRORLEVEL%
)

echo.
echo 3. 检查生成的可执行文件...
if exist backend.exe (
    echo ✓ 生成了可执行文件: backend.exe
) else (
    echo - 没有生成可执行文件
)

pause