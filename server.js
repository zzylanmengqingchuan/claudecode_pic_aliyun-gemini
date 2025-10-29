const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

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

// 风格映射到阿里云百炼的 style_index
const STYLE_INDEX_MAP = {
    business: 0,   // 商务正式风格
    creative: 3,   // 创意活力风格
    artistic: 6    // 艺术肖像风格
};

// 生成头像的 API 接口
app.post('/api/generate-avatar', upload.single('image'), async (req, res) => {
    console.log('收到生成头像请求');
    console.log('req.file:', req.file ? req.file.filename : '无');
    console.log('req.body.style:', req.body.style);

    try {
        if (!req.file) {
            console.log('错误: 未上传图片文件');
            return res.status(400).json({
                success: false,
                error: '未上传图片文件'
            });
        }

        const style = req.body.style;
        if (!style || STYLE_INDEX_MAP[style] === undefined) {
            console.log('错误: 无效的风格选择, style =', style);
            console.log('可用的风格:', Object.keys(STYLE_INDEX_MAP));
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

        console.log('调用阿里云百炼 API...');

        // 调用阿里云百炼人像风格重绘 API
        const generatedImageUrl = await generateImageWithDashScope(req.file.path, style);

        // 下载生成的图片
        const generatedImageData = await downloadImage(generatedImageUrl);

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

// 使用阿里云百炼人像风格重绘 API
async function generateImageWithDashScope(imagePath, style) {
    return new Promise((resolve, reject) => {
        console.log('准备调用阿里云百炼人像风格重绘模型...');

        const styleIndex = STYLE_INDEX_MAP[style];

        // 读取图片并转换为 base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;

        // 构建请求体
        const requestBody = JSON.stringify({
            model: 'wanx-style-repaint-v1',
            input: {
                image_url: imageUrl,
                style_index: styleIndex
            }
        });

        // API 配置
        const options = {
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: '/api/v1/services/aigc/image-generation/generation',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json',
                'X-DashScope-Async': 'enable'
            },
            timeout: 120000
        };

        console.log('发送请求到阿里云百炼 API...');

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
                    console.log('成功创建任务，task_id:', response.output?.task_id);

                    if (!response.output || !response.output.task_id) {
                        reject(new Error('API 响应中未找到 task_id'));
                        return;
                    }

                    // 轮询查询任务结果
                    pollTaskResult(response.output.task_id, resolve, reject);

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

        req.write(requestBody);
        req.end();
    });
}

// 轮询查询任务结果
function pollTaskResult(taskId, resolve, reject, retries = 0) {
    const maxRetries = 30; // 最多轮询30次
    const interval = 2000; // 每2秒查询一次

    if (retries >= maxRetries) {
        reject(new Error('任务超时，生成失败'));
        return;
    }

    setTimeout(() => {
        console.log(`查询任务状态 (第 ${retries + 1} 次)...`);

        const options = {
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: `/api/v1/tasks/${taskId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('任务状态:', response.output?.task_status);

                    if (response.output?.task_status === 'SUCCEEDED') {
                        // 任务成功，获取图片 URL
                        const imageUrl = response.output?.results?.[0]?.url;
                        if (imageUrl) {
                            console.log('图片生成成功:', imageUrl);
                            resolve(imageUrl);
                        } else {
                            reject(new Error('API 响应中未找到生成的图片 URL'));
                        }
                    } else if (response.output?.task_status === 'FAILED') {
                        reject(new Error('图片生成任务失败'));
                    } else {
                        // 任务还在处理中，继续轮询
                        pollTaskResult(taskId, resolve, reject, retries + 1);
                    }
                } catch (error) {
                    reject(new Error(`解析任务结果失败: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`查询任务失败: ${error.message}`));
        });

        req.end();
    }, interval);
}

// 下载图片并转换为 base64
function downloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
        https.get(imageUrl, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`下载图片失败，状态码: ${res.statusCode}`));
                return;
            }

            const chunks = [];
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                resolve(base64);
            });
        }).on('error', (error) => {
            reject(new Error(`下载图片失败: ${error.message}`));
        });
    });
}

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: '服务运行正常',
        apiKeyConfigured: !!DASHSCOPE_API_KEY,
        model: 'wanx-style-repaint-v1',
        provider: '阿里云百炼'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`专业头像生成器服务已启动`);
    console.log(`服务地址: http://localhost:${PORT}`);
    console.log(`API Key 已配置: ${DASHSCOPE_API_KEY ? '是' : '否'}`);
    console.log(`使用模型: wanx-style-repaint-v1 (阿里云百炼)`);
    console.log(`===========================================`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    process.exit(0);
});
