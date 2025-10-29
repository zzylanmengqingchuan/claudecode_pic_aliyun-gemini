@echo off
echo ============================================
echo Dove VPN 代理端口自动检测
echo ============================================
echo.
echo 正在检测 Dove VPN 的代理端口...
echo.

REM 定义常见端口列表（Dove VPN 可能使用的端口）
set PORTS=10808 1080 10809 7890 8080 1087 7891 10810

set FOUND_PORT=

for %%P in (%PORTS%) do (
    echo [测试] 端口 %%P...
    curl -I --connect-timeout 2 --proxy http://127.0.0.1:%%P https://www.google.com >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo ✓ 找到可用端口: %%P
        set FOUND_PORT=%%P
        goto :found
    ) else (
        echo ✗ 端口 %%P 不可用
    )
)

:not_found
echo.
echo ========================================
echo ✗ 未找到可用的代理端口！
echo ========================================
echo.
echo 可能原因:
echo 1. Dove VPN 未启动或未连接
echo 2. Dove VPN 使用了非常见端口
echo 3. Dove VPN 未开启本地代理
echo.
echo 请手动检查:
echo 1. 打开 Dove VPN
echo 2. 进入设置/偏好设置
echo 3. 查找 "端口" 或 "代理" 设置
echo 4. 记下端口号
echo 5. 修改 start-with-proxy.bat 中的 PROXY_PORT 值
echo.
pause
exit /b 1

:found
echo.
echo ========================================
echo ✓ 检测成功！
echo ========================================
echo.
echo Dove VPN 代理端口: %FOUND_PORT%
echo.
echo 现在将使用此端口启动服务器...
echo.
pause

REM 设置环境变量
set HTTP_PROXY=http://127.0.0.1:%FOUND_PORT%
set HTTPS_PROXY=http://127.0.0.1:%FOUND_PORT%

echo ============================================
echo 专业头像生成器 - 启动中
echo ============================================
echo.
echo 代理设置: http://127.0.0.1:%FOUND_PORT%
echo 服务地址: http://localhost:3000
echo.
echo 按 Ctrl+C 可以停止服务器
echo.
echo ============================================
echo.

npm start
