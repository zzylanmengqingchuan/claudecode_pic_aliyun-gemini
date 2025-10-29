@echo off
echo ============================================
echo 专业头像生成器 - 启动脚本
echo ============================================
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [1/2] 首次运行，正在安装依赖...
    call npm install
    echo.
) else (
    echo [1/2] 依赖已安装，跳过安装步骤
    echo.
)

echo [2/2] 启动服务器...
echo.
echo 服务将在 http://localhost:3000 启动
echo 按 Ctrl+C 可以停止服务器
echo.
echo ============================================
echo.

call npm start
