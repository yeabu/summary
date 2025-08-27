# React 前端应用启动指南

## 项目信息

- **技术栈**: React 18 + TypeScript + Vite + Material-UI
- **开发端口**: 3000
- **API 服务**: http://localhost:8080 (Go后端)
- **构建工具**: Vite

## 快速启动

### 方法1: 使用启动脚本 (推荐)
```bash
# 在 react-app 目录下运行
start-frontend.bat
```

### 方法2: 手动启动
```bash
cd react-app
npm install          # 安装依赖
npm run dev          # 启动开发服务器
```

### 方法3: 使用其他命令
```bash
npm start           # 等同于 npm run dev
npm run build       # 生产构建
npm run preview     # 预览生产构建
```

## 环境配置

### 环境变量 (.env)
```ini
VITE_ALLOW_SIGNUP="true"
VITE_API_URL=http://localhost:8080
```

### 配置说明
- `VITE_ALLOW_SIGNUP`: 是否允许用户注册
- `VITE_API_URL`: 后端API服务地址

## 开发工具

### 代码格式化
```bash
npm run format      # 使用 Prettier 格式化代码
npm run lint        # ESLint 代码检查
```

### 类型检查
```bash
npm run type        # TypeScript 类型检查
npm run check-ts    # 仅检查类型，不生成文件
```

### 测试
```bash
npm test           # 运行 Vitest 测试
npm run test:jest  # 运行 Jest 测试
```

## 项目结构

```
react-app/
├── src/
│   ├── api/           # API 客户端和接口定义
│   ├── auth/          # 认证相关组件和逻辑
│   ├── components/    # 可复用的 UI 组件
│   ├── routes/        # 路由配置
│   ├── theme/         # 主题和样式配置
│   ├── utils/         # 工具函数
│   ├── views/         # 页面视图组件
│   ├── App.tsx        # 应用主组件
│   └── main.tsx       # 应用入口
├── public/            # 静态资源
├── package.json       # 项目配置和依赖
├── vite.config.ts     # Vite 配置
├── tsconfig.json      # TypeScript 配置
└── .env              # 环境变量
```

## 依赖包说明

### 核心依赖
- **React 18**: 前端框架
- **TypeScript**: 类型安全
- **Material-UI**: UI 组件库
- **React Router**: 路由管理
- **Axios**: HTTP 客户端
- **Zustand**: 状态管理

### 开发依赖
- **Vite**: 构建工具
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Vitest**: 测试框架

## 功能模块

### 认证系统
- 用户登录/登出
- JWT Token 管理
- 权限控制

### 数据管理
- 费用记录管理
- 采购记录管理
- 数据统计和图表

### UI 组件
- 响应式布局
- Material Design 风格
- 深色/浅色主题切换

## 与后端交互

### API 客户端配置
前端通过 `src/api/` 目录下的模块与后端通信：

- **ApiClient.ts**: HTTP 客户端配置
- **AuthManager.ts**: 认证管理
- **BaseExpenseApi.ts**: 费用记录 API
- **AppDtos.ts**: 数据类型定义

### 请求拦截器
- 自动添加 Authorization 头
- 统一错误处理
- 请求/响应日志

## 故障排除

### 常见问题

1. **PowerShell 执行策略错误**
   - 使用提供的 `start-frontend.bat` 脚本
   - 或在管理员模式下运行: `Set-ExecutionPolicy RemoteSigned`

2. **端口占用**
   - 检查端口 3000 是否被占用
   - 修改 `vite.config.ts` 中的端口配置

3. **API 连接失败**
   - 确保后端服务在 8080 端口运行
   - 检查 `.env` 文件中的 API URL 配置

4. **依赖安装失败**
   - 清除缓存: `npm cache clean --force`
   - 删除 `node_modules` 和 `package-lock.json` 重新安装

### 开发建议

1. **热重载**: Vite 支持快速热重载，修改代码后会自动刷新
2. **开发工具**: 推荐使用 React DevTools 浏览器扩展
3. **代码规范**: 遵循 ESLint 和 Prettier 的代码格式规范
4. **类型安全**: 充分利用 TypeScript 的类型检查功能

## 部署

### 开发环境
```bash
npm run dev          # 启动开发服务器
```

### 生产构建
```bash
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
```

### Docker 部署
```bash
docker build -t summary-frontend .
docker run -p 3000:80 summary-frontend
```

## 相关文档

- [Vite 文档](https://vitejs.dev/)
- [React 文档](https://react.dev/)
- [Material-UI 文档](https://mui.com/)
- [TypeScript 文档](https://www.typescriptlang.org/)

---

**注意**: 启动前端服务前，请确保后端 Go 服务已在 8080 端口运行。