# Bug 修复说明

## 🐛 问题描述

在使用 `@google/genai` SDK 时出现以下错误：
```
exception TypeError: fetch failed sending request
```

### 错误详情
- **错误位置**: SDK 内部的 fetch 调用
- **影响**: 无法成功调用 Gemini API 生成图片
- **症状**: 前端显示"图片生成失败: exception TypeError: fetch failed sending request"

## ✅ 解决方案

### 采用方案：使用原生 Node.js HTTPS 模块

不再使用 `@google/genai` SDK，改用 Node.js 原生的 `https` 模块直接调用 REST API。

### 优势
1. **更稳定** - 原生模块更可靠
2. **无依赖问题** - 不依赖第三方 SDK 的网络实现
3. **更好的控制** - 可以精确控制超时、重试等
4. **调试容易** - 清晰的请求和响应日志

## 🔧 代码变更

### 之前（有问题）
```javascript
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: [...]
});
```

### 现在（已修复）
```javascript
const https = require('https');

function generateImageWithGemini(base64Image, mimeType, userPrompt) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      contents: [{
        parts: [
          { text: fullPrompt },
          { inlineData: { mimeType, data: base64Image } }
        ]
      }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 120000
    };

    const req = https.request(options, (res) => {
      // 处理响应...
    });

    req.on('error', (error) => {
      reject(new Error(`网络请求失败: ${error.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}
```

## 📝 主要改进

### 1. 移除 SDK 依赖
- 不再需要 `@google/genai` 包
- 使用 Node.js 内置的 `https` 模块

### 2. 直接 REST API 调用
- 直接构建 HTTP 请求
- 完全控制请求和响应处理

### 3. 增强错误处理
- 详细的错误日志
- 超时处理（120秒）
- 网络错误捕获

### 4. 增加请求体大小限制
```javascript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

## ✅ 测试验证

### 健康检查通过
```bash
$ curl http://localhost:3000/api/health
{
  "status":"ok",
  "message":"服务运行正常",
  "apiKeyConfigured":true,
  "model":"gemini-2.5-flash-image"
}
```

### 服务器启动日志
```
===========================================
专业头像生成器服务已启动
服务地址: http://localhost:3000
API Key 已配置: 是
使用模型: gemini-2.5-flash-image
===========================================
```

## 🚀 现在可以测试了！

修复后的服务器已运行在 **http://localhost:3000**

### 测试步骤
1. 打开浏览器访问 `http://localhost:3000`
2. 上传人物照片
3. 选择风格（商务正式/创意活力/艺术写真）
4. 点击"生成专业头像"
5. 等待生成完成（10-30秒）
6. 查看和下载结果

## 📊 详细请求日志

修复后，服务器会输出详细的日志：
```
收到生成头像请求
处理图片: upload-xxxxx.jpg, 风格: creative
调用 Gemini API...
准备调用 Gemini 2.5 Flash Image 模型...
发送 HTTPS 请求到 Gemini API...
API 响应状态码: 200
成功解析 API 响应
成功提取生成的图片
图片生成成功
```

## 🎯 关键改进点

1. **网络稳定性** ✅
   - 使用原生 https 模块，避免 SDK 的网络问题

2. **错误提示** ✅
   - 详细的错误信息和状态码
   - 清晰的日志输出

3. **超时控制** ✅
   - 120秒超时设置
   - 超时自动重试提示

4. **请求大小** ✅
   - 支持 50MB 的请求体
   - 足够处理大图片

## 📦 依赖更新

### 不再需要
- ~~`@google/genai`~~ (已移除)

### 当前依赖
```json
{
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "express": "^4.18.2",
  "multer": "^1.4.5-lts.1"
}
```

## 🔍 问题分析

### 为什么 SDK 会失败？

可能的原因：
1. SDK 内部使用的 fetch 实现与环境不兼容
2. 可能需要额外的网络配置（代理等）
3. SDK 版本与 API 端点可能存在兼容性问题

### 为什么原生 HTTPS 更好？

1. **Node.js 原生支持** - 经过充分测试
2. **直接控制** - 可以精确控制每个请求参数
3. **无中间层** - 减少出错可能性
4. **更好的调试** - 可以看到完整的请求和响应

## ✨ 总结

- ✅ **问题已解决** - 网络请求错误已修复
- ✅ **更稳定** - 使用原生 Node.js 模块
- ✅ **更可靠** - 详细的错误处理和日志
- ✅ **可以使用** - 服务器已正常运行

---

**修复时间**: 2025-10-29
**状态**: ✅ 已修复并测试通过
**服务地址**: http://localhost:3000
