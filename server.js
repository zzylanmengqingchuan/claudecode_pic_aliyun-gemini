const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.')); // 提供静态文件服务

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件格式'));
        }
    }
});

// 风格对应的 Prompt 配置
const STYLE_PROMPTS = {
    business: `Transform this person's photo into a professional business headshot with the following characteristics:
- Professional and formal appearance
- Clean, neutral background (solid color or subtle gradient)
- Professional business attire
- Proper lighting that highlights facial features
- Corporate headshot quality
- Maintain the person's facial features and likeness
- Professional color grading suitable for LinkedIn or corporate profiles
- High quality, sharp details`,

    creative: `Transform this person's photo into a creative and vibrant portrait with the following characteristics:
- Dynamic and energetic composition
- Vibrant and rich colors
- Creative and artistic styling
- Modern and trendy appearance
- Unique personality expression
- Maintain the person's facial features and likeness
- Suitable for social media and personal branding
- Eye-catching visual appeal
- High quality with creative flair`,

    artistic: `Transform this person's photo into an artistic portrait with the following characteristics:
- Artistic and cinematic quality
- Dramatic lighting with strong shadows and highlights
- Textured or atmospheric background
- Fine art photography aesthetic
- Strong sense of mood and atmosphere
- Maintain the person's facial features and likeness
- Suitable for artist profiles and portfolios
- Professional artistic treatment
- High quality with artistic depth`
};

// 生成头像的 API 接口
app.post('/api/generate-avatar', upload.single('image'), async (req, res) => {
    console.log('收到生成头像请求');

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '未上传图片文件'
            });
        }

        const style = req.body.style;
        if (!style || !STYLE_PROMPTS[style]) {
            return res.status(400).json({
                success: false,
                error: '无效的风格选择'
            });
        }

        console.log(`处理图片: ${req.file.filename}, 风格: ${style}`);

        // 读取上传的图片文件
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        // 获取对应风格的 prompt
        const prompt = STYLE_PROMPTS[style];

        console.log('调用 Gemini API...');

        // 调用 Google Gemini API 生成图片
        const generatedImageData = await generateImageWithGemini(base64Image, mimeType, prompt);

        // 清理上传的临时文件
        fs.unlinkSync(req.file.path);

        console.log('图片生成成功');

        // 返回结果
        res.json({
            success: true,
            data: {
                original_url: `data:${mimeType};base64,${base64Image}`,
                generated_url: `data:image/png;base64,${generatedImageData}`,
                style: style
            }
        });

    } catch (error) {
        console.error('生成头像错误:', error);

        // 清理临时文件
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: error.message || '生成头像失败，请稍后重试'
        });
    }
});

// 使用原生 HTTPS 调用 Gemini API
function generateImageWithGemini(base64Image, mimeType, userPrompt) {
    return new Promise((resolve, reject) => {
        console.log('准备调用 Gemini 2.5 Flash Image 模型...');

        // 构建完整的 prompt
        const fullPrompt = `Based on the provided portrait photo, ${userPrompt}`;

        // 构建请求体
        const requestBody = JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: fullPrompt
                        },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Image
                            }
                        }
                    ]
                }
            ]
        });

        // API 配置
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            },
            timeout: 120000 // 120 秒超时
        };

        // 如果设置了代理，使用代理
        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        if (proxyUrl) {
            options.agent = new HttpsProxyAgent(proxyUrl);
            console.log(`使用代理: ${proxyUrl}`);
        }

        console.log('发送 HTTPS 请求到 Gemini API...');

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`API 响应状态码: ${res.statusCode}`);

                if (res.statusCode !== 200) {
                    console.error('API 错误响应:', data);
                    reject(new Error(`API 错误 (${res.statusCode}): ${data}`));
                    return;
                }

                try {
                    const response = JSON.parse(data);
                    console.log('成功解析 API 响应');

                    // 提取生成的图片数据
                    if (response.candidates && response.candidates.length > 0) {
                        const parts = response.candidates[0].content.parts;

                        for (const part of parts) {
                            if (part.text) {
                                console.log('API 响应文本:', part.text);
                            }
                            if (part.inlineData) {
                                console.log('成功提取生成的图片');
                                resolve(part.inlineData.data);
                                return;
                            }
                        }
                    }

                    reject(new Error('API 响应中未找到生成的图片'));
                } catch (error) {
                    console.error('解析 API 响应失败:', error);
                    reject(new Error(`解析响应失败: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('HTTPS 请求错误:', error);
            reject(new Error(`网络请求失败: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('请求超时，请稍后重试'));
        });

        // 发送请求体
        req.write(requestBody);
        req.end();
    });
}

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: '服务运行正常',
        apiKeyConfigured: !!GEMINI_API_KEY,
        model: 'gemini-2.5-flash-image',
        provider: 'Google Gemini'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`专业头像生成器服务已启动`);
    console.log(`服务地址: http://localhost:${PORT}`);
    console.log(`API Key 已配置: ${GEMINI_API_KEY ? '是' : '否'}`);
    console.log(`使用模型: gemini-2.5-flash-image (Google Gemini)`);
    console.log(`===========================================`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});
