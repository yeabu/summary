# Docker 部署指南

本指南使用 docker-compose 一键启动 MySQL、后端 Go 服务、前端 Nginx。

## 目录结构

- `docker/Dockerfile.backend`：后端镜像构建
- `docker/Dockerfile.frontend`：前端镜像构建 + Nginx 托管
- `docker-compose.yml`：编排文件
- `db/init.sql`：数据库初始化（创建库和账号）
- `nginx.conf`：Nginx 站点配置（前端 SPA + 反向代理 `/api/` 到后端）

## 先决条件

- Docker 20+、docker-compose v2+

## 快速启动

1) 构建并启动

```bash
docker compose build
docker compose up -d
```

启动后：
- 前端（Nginx）：http://localhost/
- 后端（Go）：http://localhost:8080 （通过前端 Nginx 的 `/api/` 反代访问）
- MySQL：localhost:3306，库 `summary`，用户 `app/app123`（root 密码：`rootpass`）

> 环境变量（可在 `docker-compose.yml` 中调整）：
> - `MYSQL_DSN`（后端）：`app:app123@tcp(db:3306)/summary?charset=utf8mb4&parseTime=true&loc=Local`
> - `JWT_SECRET`：请修改为安全值

2) 初始化数据（可选）

后端会自动创建表结构（GORM AutoMigrate）。若需创建初始管理员账号，可选择以下任一方式：

- 方式 A：使用临时 Node 容器生成 bcrypt 哈希，然后插入 SQL
  ```bash
  # 生成密码 admin123 的 bcrypt 哈希
  docker run --rm node:18-alpine node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
  # 记下输出的哈希，例如 $2a$10$xxxx...

  # 进入 MySQL 容器
  docker compose exec db bash -lc 'mysql -uroot -prootpass summary'
  -- 表已由后端创建后执行，插入管理员（示例字段名以当前模型为准）
  INSERT INTO users(name, role, password) VALUES ('admin', 'admin', '<粘贴上一步的bcrypt哈希>');
  ```

- 方式 B：在后端容器内执行辅助二进制重置管理员密码
  ```bash
  docker compose exec backend /app/reset_passwords
  # 控制台输出成功后，即可使用 admin/admin123 登录
  ```

- 方式 C：使用已有数据迁移脚本/导入你现有数据库（如生产备份）

完成后可用 `admin/admin123` 登录，然后在“人员管理”中创建其他用户。

## 常见操作

- 查看日志
  ```bash
  docker compose logs -f backend
  docker compose logs -f frontend
  docker compose logs -f db
  ```

- 重建镜像
  ```bash
  docker compose build --no-cache
  docker compose up -d --force-recreate
  ```

- 数据持久化
  - MySQL 数据保存于 `db-data` 卷。删除容器不影响数据。

## 自定义配置

- 修改端口：
  - 前端：`docker-compose.yml` 中 `frontend.ports`（默认 `80:80`）
  - 后端直连：编辑 `backend` 服务，映射 `8080` 端口（当前通过 Nginx 反代无需额外暴露）

- API Base（前端构建时变量）：
  - `docker/Dockerfile.frontend` 中 `ENV VITE_API_URL=` 为空代表与前端同域，且代码内已使用 `/api/...` 前缀；由 Nginx 反代至后端。

- Nginx:
  - 站点配置位于 `nginx.conf`，默认将 `/` 指向打包产物，将 `/api/` 转发至 `backend-app:8080`。
  - 已开启 `gzip` 压缩与静态资源长缓存（带哈希文件 1 年；`index.html` 禁止缓存）。

## 停止与清理

```bash
docker compose down    # 停止
# docker compose down -v  # 如需连同数据库卷一起删除
```

---

# 单独构建镜像（可选）

- 后端
  ```bash
  docker build -f docker/Dockerfile.backend -t summary-backend:latest .
  ```
- 前端
  ```bash
  docker build -f docker/Dockerfile.frontend -t summary-frontend:latest .
  ```
