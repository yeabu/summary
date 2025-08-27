# Go代理配置说明

本项目支持配置国内Go代理源，以提高依赖包下载速度。

## 快速配置

### Windows系统
```bash
# 在backend目录下运行
setup-goproxy.bat
```

### Linux/Mac系统
```bash
# 在backend目录下运行
chmod +x setup-goproxy.sh
./setup-goproxy.sh
```

## 手动配置

如果您想手动配置Go代理，可以使用以下命令：

### 设置代理源
```bash
# 七牛云代理（推荐）
go env -w GOPROXY=https://goproxy.cn,direct

# 阿里云代理（备选）
go env -w GOPROXY=https://mirrors.aliyun.com/goproxy/,direct

# 百度代理（备选）
go env -w GOPROXY=https://goproxy.bj.bcebos.com/,direct
```

### 设置校验和代理
```bash
go env -w GOSUMDB=sum.golang.google.cn
```

### 设置私有模块（可选）
```bash
go env -w GOPRIVATE=*.corp.example.com,rsc.io/private
```

## 验证配置

配置完成后，您可以验证设置：

```bash
# 查看当前代理设置
go env GOPROXY

# 查看校验和设置
go env GOSUMDB

# 测试下载依赖
go mod download
```

## 还原默认配置

如果需要还原到默认的官方代理：

```bash
go env -w GOPROXY=https://proxy.golang.org,direct
go env -w GOSUMDB=sum.golang.org
```

## 常用国内代理源

| 提供商 | 代理地址 | 备注 |
|--------|----------|------|
| 七牛云 | https://goproxy.cn | 推荐，稳定快速 |
| 阿里云 | https://mirrors.aliyun.com/goproxy/ | 阿里云镜像 |
| 百度 | https://goproxy.bj.bcebos.com/ | 百度云代理 |

## 注意事项

1. 配置代理后，第一次下载可能仍需要一些时间来同步包
2. 如果遇到某些包无法下载，可以尝试切换不同的代理源
3. 企业内网环境可能需要额外配置私有代理