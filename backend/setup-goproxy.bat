@echo off
echo 正在设置Go代理为国内源...

REM 设置Go代理为七牛云的goproxy.cn (推荐)
go env -w GOPROXY=https://goproxy.cn,direct

REM 设置Go模块校验总和的代理
go env -w GOSUMDB=sum.golang.google.cn

REM 设置私有模块不使用代理
go env -w GOPRIVATE=*.corp.example.com,rsc.io/private

echo Go代理已设置完成!
echo 当前GOPROXY设置:
go env GOPROXY

echo 当前GOSUMDB设置:
go env GOSUMDB

echo.
echo 如需还原默认设置，请运行：
echo go env -w GOPROXY=https://proxy.golang.org,direct
echo go env -w GOSUMDB=sum.golang.org

pause