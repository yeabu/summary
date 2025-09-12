# Summary 项目前后端联调指南

## 快速启动

### 1. 启动后端服务
```bash
cd backend
start-backend.bat
```
后端将在 http://localhost:8080 启动

### 2. 启动前端服务  
```bash
cd react-app
start-frontend.bat
```
前端将在 http://localhost:3000 启动

### 3. 运行联调测试
```bash
# 在项目根目录运行
integration_test_simple.bat
```

## 测试账户

### 管理员账户
- **用户名**: `admin`
- **密码**: `admin123456`
- **权限**: 所有功能权限
  - 查看/创建采购记录
  - 查看所有基地的费用记录
  - 查看费用统计

### 基地代理账户
- **用户名**: `agent_1` 到 `agent_19`
- **密码**: `agent123`
- **权限**: 费用管理权限
  - 创建自己基地的费用记录
  - 查看自己基地的费用记录
  - 修改自己创建的费用记录

## 前后端对接验证

### 1. API接口对接验证

#### 登录接口测试
```bash
# 管理员登录
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"name":"admin","password":"admin123456"}'

# 基地代理登录  
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"name":"agent_1","password":"agent123"}'
```

#### 业务接口测试
```bash
# 查询采购记录 (需要管理员token)
curl -X GET http://localhost:8080/api/purchase/list \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 查询费用记录
curl -X GET http://localhost:8080/api/expense/list \
  -H "Authorization: Bearer YOUR_TOKEN"

# 费用统计
curl -X GET "http://localhost:8080/api/expense/stats?month=2024-08" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 前端功能验证

#### 访问前端应用
1. 打开浏览器访问: http://localhost:3000
2. 使用测试账户登录
3. 验证以下功能:

**管理员功能测试:**
- [ ] 登录成功
- [ ] 查看采购记录列表
- [ ] 查看费用记录列表  
- [ ] 查看费用统计图表
- [ ] 权限管理功能

**基地代理功能测试:**
- [ ] 登录成功
- [ ] 创建费用记录
- [ ] 查看自己基地的费用记录
- [ ] 修改自己创建的费用记录
- [ ] 查看费用统计

### 3. 跨域和认证验证

#### CORS配置验证
- 前端 (localhost:3000) 可以正常调用后端 (localhost:8080)
- 预检请求 (OPTIONS) 正常响应
- 认证头正确传递

#### JWT Token验证
- 登录后Token正确存储在localStorage
- API请求自动携带Authorization头
- Token过期处理机制

## 数据验证

### 测试数据概览
- **用户**: 20个 (1个admin + 19个agent)
- **采购记录**: 30条
- **费用记录**: 50条
- **基地**: 10个不同基地
- **费用类别**: 12种类别

### 数据验证脚本
```bash
cd backend
verify_data.bat
```

## 常见问题排查

### 1. 后端启动失败
- 检查数据库连接: 确保MySQL服务运行在 192.168.0.132:32555
- 检查环境变量: MYSQL_DSN 和 JWT_SECRET 是否正确设置
- 检查端口占用: 确保 8080 端口未被占用

### 2. 前端启动失败
- 检查Node.js环境: 确保已安装Node.js
- 检查依赖安装: 运行 `npm install`
- 检查端口占用: 确保 3000 端口未被占用
- PowerShell权限问题: 使用提供的 .bat 脚本

### 3. 前后端通信失败
- 检查API URL配置: 前端 .env 文件中的 VITE_API_URL
- 检查CORS设置: 后端 CORS 中间件配置
- 检查网络连接: curl 测试API接口可达性

### 4. 登录失败
- 检查用户名密码: admin/admin123456 或 agent_1/agent123
- 检查数据库数据: 运行数据验证脚本
- 检查密码哈希: bcrypt 加密是否正确

### 5. 权限问题
- 检查JWT Token: 是否正确包含用户信息
- 检查中间件: 权限验证逻辑是否正确
- 检查用户角色: admin 和 base_agent 权限差异

## 开发调试

### 后端调试
- 查看控制台日志输出
- 使用Postman测试API接口
- 检查数据库数据变化

### 前端调试
- 打开浏览器开发者工具
- 查看Network标签页的API请求
- 查看Console标签页的错误信息
- 检查localStorage中的token存储

## 项目文件结构

```
summary/
├── backend/                 # Go后端服务
│   ├── main.go             # 程序入口
│   ├── start-backend.bat   # 后端启动脚本
│   └── tools/              # 数据生成和验证工具
├── react-app/              # React前端应用
│   ├── src/                # 源代码
│   ├── start-frontend.bat  # 前端启动脚本
│   └── .env               # 环境变量配置
├── API_DOCUMENTATION.md   # API接口文档
├── integration_test_simple.bat # 联调测试脚本
└── docker-compose.yml     # Docker部署配置
```

## 部署说明

### 开发环境部署
按照上述快速启动步骤即可

### 生产环境部署
```bash
# 使用Docker Compose
docker-compose up -d
```

---

**注意**: 
1. 确保MySQL数据库服务正常运行
2. 首次运行需要生成测试数据
3. 前端会自动打开浏览器访问应用
4. 所有API接口都支持跨域访问