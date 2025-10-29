@echo off
echo ============================================
echo 专业头像生成器 - VPN 代理启动脚本
echo ============================================
echo.
echo 请确保你的 VPN 已经连接！
echo.

REM ========================================
REM 代理配置区域 - 请根据你的 VPN 修改端口
REM ========================================

REM Clash 默认端口: 7890
REM V2RayN 默认端口: 10809
REM Shadowsocks 默认端口: 1080

REM 请修改下面的端口号为你的 VPN 端口
set PROXY_PORT=3100

REM ========================================

echo [1/3] 设置代理环境变量...
set HTTP_PROXY=http://127.0.0.1:%PROXY_PORT%
set HTTPS_PROXY=http://127.0.0.1:%PROXY_PORT%
echo 代理设置: http://127.0.0.1:%PROXY_PORT%
echo.

echo [2/3] 测试代理连接...
curl -I --proxy http://127.0.0.1:%PROXY_PORT% https://www.google.com -m 5 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ 代理连接正常
) else (
    echo ✗ 代理连接失败！
    echo.
    echo 可能原因:
    echo 1. VPN 未启动
    echo 2. 代理端口 %PROXY_PORT% 不正确
    echo 3. VPN 未开启 "允许来自局域网的连接"
    echo.
    echo 请检查你的 VPN 设置，或修改本脚本中的 PROXY_PORT 值
    echo.
    pause
    exit /b 1
)
echo.

echo [3/3] 启动服务器...
echo.
echo 服务将在 http://localhost:3000 启动
echo 按 Ctrl+C 可以停止服务器
echo.
echo ============================================
echo.

npm start
