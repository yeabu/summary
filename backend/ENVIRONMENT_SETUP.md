# 环境变量配置说明

## 问题描述
错误信息: `MYSQL_DSN env is required`

这表示Go程序需要 `MYSQL_DSN` 环境变量来连接数据库。

## 解决方案

### 方案1: 使用 .env 文件 (推荐)

我已经为项目添加了自动加载 `.env` 文件的功能。

**.env 文件已存在于 backend 目录下，内容如下:**
```
MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local
JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET
```

**运行方式:**
```bash
cd backend
go run .
```

### 方案2: 手动设置环境变量

#### Windows (PowerShell)
```powershell
$env:MYSQL_DSN="root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"
$env:JWT_SECRET="REPLACE_THIS_WITH_YOUR_SECRET"
go run .
```

#### Windows (CMD)
```cmd
set MYSQL_DSN=root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4^&parseTime=True^&loc=Local
set JWT_SECRET=REPLACE_THIS_WITH_YOUR_SECRET
go run .
```

#### Linux/Mac
```bash
export MYSQL_DSN="root:wanfu!@#@tcp(192.168.0.132:32555)/summary?charset=utf8mb4&parseTime=True&loc=Local"
export JWT_SECRET="REPLACE_THIS_WITH_YOUR_SECRET"
go run .
```

### 方案3: 使用提供的启动脚本

我已经创建了几个启动脚本：

- `start-backend.bat` - 直接设置环境变量并启动
- `debug-env.bat` - 调试环境变量配置

### 方案4: 使用 Docker Compose (生产环境推荐)

```bash
# 在项目根目录下运行
docker-compose up
```

## 数据库连接信息

当前配置的数据库连接信息：
- **主机**: 192.168.0.132
- **端口**: 32555
- **用户名**: root
- **密码**: wanfu!@#
- **数据库名**: summary

## 注意事项

1. **数据库服务必须运行**: 确保 MySQL 数据库服务在 `192.168.0.132:32555` 上运行
2. **网络连接**: 确保能够访问指定的数据库服务器
3. **数据库存在**: 确保 `summary` 数据库已创建
4. **权限配置**: 确保用户 `root` 有访问 `summary` 数据库的权限

## 故障排除

### 检查数据库连接
```bash
# 使用 MySQL 客户端测试连接
mysql -h 192.168.0.132 -P 32555 -u root -p summary
```

### 检查环境变量是否正确加载
运行 `debug-env.bat` 脚本查看详细信息。

### 常见错误

1. **连接超时**: 检查网络和防火墙设置
2. **认证失败**: 验证用户名和密码
3. **数据库不存在**: 创建 `summary` 数据库

## 修改的代码

我已经修改了 `main.go` 文件，添加了 `loadEnv()` 函数来自动加载 `.env` 文件中的环境变量。