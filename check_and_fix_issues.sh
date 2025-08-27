#!/bin/bash
# 前后端代码异常问题检查和修复脚本

echo "=== 项目代码异常问题检查和修复 ==="

# 1. 检查项目结构
echo "1. 检查项目结构..."
if [ -d "backend" ]; then
    echo "✓ 后端目录存在"
else
    echo "✗ 后端目录不存在"
fi

if [ -d "react-app" ]; then
    echo "✓ 前端目录存在"
else
    echo "✗ 前端目录不存在"
fi

# 2. 检查后端Go代码编译问题
echo -e "\n2. 检查后端代码..."
cd backend
if [ -f "go.mod" ]; then
    echo "✓ Go模块文件存在"
    echo "尝试编译后端主程序..."
    if go build -o main main.go; then
        echo "✓ 后端主程序编译成功"
        rm -f main
    else
        echo "✗ 后端主程序编译失败"
    fi
else
    echo "✗ Go模块文件不存在，尝试初始化..."
    go mod init backend
fi

# 检查tools目录下的文件
echo "检查tools目录下的Go文件..."
for file in tools/*.go; do
    if [ -f "$file" ]; then
        echo "编译测试: $file"
        if go run "$file" --help 2>/dev/null || go build -o /tmp/test "$file" 2>/dev/null; then
            echo "✓ $file 编译正常"
            rm -f /tmp/test
        else
            echo "✗ $file 存在编译问题"
        fi
    fi
done

cd ..

# 3. 检查前端代码
echo -e "\n3. 检查前端代码..."
cd react-app
if [ -f "package.json" ]; then
    echo "✓ package.json存在"
    echo "检查依赖安装状态..."
    if [ -d "node_modules" ]; then
        echo "✓ 依赖已安装"
    else
        echo "? 依赖未安装，尝试安装..."
        npm install
    fi
    
    echo "尝试TypeScript编译检查..."
    if npm run check-ts; then
        echo "✓ TypeScript编译检查通过"
    else
        echo "✗ TypeScript存在编译错误"
    fi
    
    echo "尝试前端构建..."
    if npm run build; then
        echo "✓ 前端构建成功"
    else
        echo "✗ 前端构建失败"
    fi
else
    echo "✗ package.json不存在"
fi

cd ..

# 4. 检查环境配置
echo -e "\n4. 检查环境配置..."
if [ -f "backend/.env" ]; then
    echo "✓ 后端环境配置文件存在"
else
    echo "? 后端环境配置文件不存在，创建默认配置..."
    cat > backend/.env << EOF
MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4
JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET
PORT=8080
EOF
    echo "✓ 已创建默认后端环境配置"
fi

if [ -f "react-app/.env" ]; then
    echo "✓ 前端环境配置文件存在"
else
    echo "? 前端环境配置文件不存在，创建默认配置..."
    cat > react-app/.env << EOF
VITE_API_URL=http://localhost:8080
EOF
    echo "✓ 已创建默认前端环境配置"
fi

# 5. 检查服务启动脚本
echo -e "\n5. 检查启动脚本..."
if [ -f "backend/start-backend.bat" ]; then
    echo "✓ 后端启动脚本存在"
else
    echo "? 创建后端启动脚本..."
    cat > backend/start-backend.bat << 'EOF'
@echo off
echo Setting environment variables...
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4
set JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET
set PORT=8080

echo Starting backend server...
go run main.go
pause
EOF
    echo "✓ 已创建后端启动脚本"
fi

if [ -f "react-app/start-frontend.bat" ]; then
    echo "✓ 前端启动脚本存在"
else
    echo "? 创建前端启动脚本..."
    cat > react-app/start-frontend.bat << 'EOF'
@echo off
echo Starting frontend development server...
npm run dev
pause
EOF
    echo "✓ 已创建前端启动脚本"
fi

echo -e "\n=== 检查完成 ==="
echo "建议下一步操作："
echo "1. 如果后端编译有问题，检查Go环境和依赖"
echo "2. 如果前端编译有问题，检查Node.js环境和依赖"
echo "3. 使用启动脚本分别启动前后端服务"
echo "4. 检查数据库连接是否正常"