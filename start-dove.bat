@echo off
echo ============================================
echo Dove VPN 专用启动脚本
echo ============================================
echo.
echo Dove VPN 本地代理端口: 3100
echo.

REM 确保 VPN 已连接
echo [1/3] 检查 Dove VPN 连接...
curl -I --connect-timeout 3 --proxy http://127.0.0.1:3100 https://www.google.com >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ✗ 无法通过 Dove VPN 连接到 Google！
    echo.
    echo 请确保:
    echo 1. Dove VPN 已启动
    echo 2. Dove VPN 已连接（选择美国节点）
    echo 3. 代理模式选择 "全局模式"
    echo.
    pause
    exit /b 1
)
echo ✓ Dove VPN 连接正常
echo.

REM 设置代理环境变量
echo [2/3] 配置代理环境变量...
set HTTP_PROXY=http://127.0.0.1:3100
set HTTPS_PROXY=http://127.0.0.1:3100
echo ✓ 代理已配置: http://127.0.0.1:3100
echo.

REM 启动服务器
echo [3/3] 启动专业头像生成器...
echo.
echo ============================================
echo 服务地址: http://localhost:3000
echo 代理端口: 3100 (Dove VPN)
echo 按 Ctrl+C 停止服务器
echo ============================================
echo.

npm start
