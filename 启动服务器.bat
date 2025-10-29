@echo off
chcp 65001 >nul
echo 正在启动服务器...
echo 代理: http://127.0.0.1:3100
echo.

set HTTP_PROXY=http://127.0.0.1:3100
set HTTPS_PROXY=http://127.0.0.1:3100

npm start

pause
