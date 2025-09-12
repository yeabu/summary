@echo off
chcp 65001 >nul
echo === 项目代码异常问题检查和修复 ===

REM 1. 检查项目结构
echo 1. 检查项目结构...
if exist "backend" (
    echo ✓ 后端目录存在
) else (
    echo ✗ 后端目录不存在
)

if exist "react-app" (
    echo ✓ 前端目录存在
) else (
    echo ✗ 前端目录不存在
)

REM 2. 检查后端Go代码
echo.
echo 2. 检查后端代码...
cd backend
if exist "go.mod" (
    echo ✓ Go模块文件存在
) else (
    echo ? Go模块文件不存在，尝试初始化...
    go mod init backend
)

echo 尝试编译后端主程序...
go build -o main.exe main.go
if %ERRORLEVEL% EQU 0 (
    echo ✓ 后端主程序编译成功
    del main.exe >nul 2>&1
) else (
    echo ✗ 后端主程序编译失败
)

echo 检查tools目录下的重要文件...
if exist "tools\fix_data_issues.go" (
    echo 测试编译 fix_data_issues.go...
    go build -o temp_fix.exe tools\fix_data_issues.go
    if %ERRORLEVEL% EQU 0 (
        echo ✓ fix_data_issues.go 编译正常
        del temp_fix.exe >nul 2>&1
    ) else (
        echo ✗ fix_data_issues.go 存在编译问题
    )
)

cd ..

REM 3. 检查前端代码
echo.
echo 3. 检查前端代码...
cd react-app
if exist "package.json" (
    echo ✓ package.json存在
    
    if exist "node_modules" (
        echo ✓ 依赖已安装
    ) else (
        echo ? 依赖未安装，尝试安装...
        npm install
    )
    
    echo 尝试TypeScript编译检查...
    npm run check-ts
    if %ERRORLEVEL% EQU 0 (
        echo ✓ TypeScript编译检查通过
    ) else (
        echo ✗ TypeScript存在编译错误
    )
) else (
    echo ✗ package.json不存在
)

cd ..

REM 4. 检查环境配置
echo.
echo 4. 检查环境配置...
if exist "backend\.env" (
    echo ✓ 后端环境配置文件存在
) else (
    echo ? 后端环境配置文件不存在，创建默认配置...
    (
        echo MYSQL_DSN=root:wanfu!@#@tcp^(192.168.0.132:32555^)/summary?charset=utf8mb4
        echo JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET
        echo PORT=8080
    ) > backend\.env
    echo ✓ 已创建默认后端环境配置
)

if exist "react-app\.env" (
    echo ✓ 前端环境配置文件存在
) else (
    echo ? 前端环境配置文件不存在，创建默认配置...
    echo VITE_API_URL=http://localhost:8080 > react-app\.env
    echo ✓ 已创建默认前端环境配置
)

REM 5. 检查启动脚本
echo.
echo 5. 检查启动脚本...
if exist "backend\start-backend.bat" (
    echo ✓ 后端启动脚本存在
) else (
    echo ? 创建后端启动脚本...
    (
        echo @echo off
        echo echo Setting environment variables...
        echo set MYSQL_DSN=root:wanfu!@#@tcp^(192.168.0.132:32555^)/summary?charset=utf8mb4
        echo set JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET
        echo set PORT=8080
        echo.
        echo echo Starting backend server...
        echo go run main.go
        echo pause
    ) > backend\start-backend.bat
    echo ✓ 已创建后端启动脚本
)

if exist "react-app\start-frontend.bat" (
    echo ✓ 前端启动脚本存在
) else (
    echo ? 创建前端启动脚本...
    (
        echo @echo off
        echo echo Starting frontend development server...
        echo npm run dev
        echo pause
    ) > react-app\start-frontend.bat
    echo ✓ 已创建前端启动脚本
)

echo.
echo === 检查完成 ===
echo 建议下一步操作：
echo 1. 如果后端编译有问题，检查Go环境和依赖
echo 2. 如果前端编译有问题，检查Node.js环境和依赖
echo 3. 使用启动脚本分别启动前后端服务
echo 4. 检查数据库连接是否正常
echo.
pause