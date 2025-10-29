// 应用状态
const AppState = {
    uploadedFile: null,
    uploadedImageUrl: null,
    selectedStyle: null,
    generatedImageUrl: null
};

// DOM 元素
const elements = {
    // 页面
    uploadPage: document.getElementById('uploadPage'),
    processingPage: document.getElementById('processingPage'),
    resultPage: document.getElementById('resultPage'),

    // 上传相关
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    previewSection: document.getElementById('previewSection'),
    previewImage: document.getElementById('previewImage'),
    removeImage: document.getElementById('removeImage'),

    // 风格选择
    styleSection: document.getElementById('styleSection'),
    styleCards: document.querySelectorAll('.style-card'),

    // 生成
    generateSection: document.getElementById('generateSection'),
    generateBtn: document.getElementById('generateBtn'),

    // 错误提示
    errorMessage: document.getElementById('errorMessage'),

    // 结果页
    originalImage: document.getElementById('originalImage'),
    generatedImage: document.getElementById('generatedImage'),
    downloadBtn: document.getElementById('downloadBtn'),
    regenerateBtn: document.getElementById('regenerateBtn'),
    backToHomeBtn: document.getElementById('backToHomeBtn')
};

// API 配置
const API_BASE_URL = 'http://localhost:3000';

// Mock 生成的图片（不同风格）- 仅作为后备方案
const MOCK_IMAGES = {
    business: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23334155" width="400" height="400"/%3E%3Ctext x="50%25" y="45%25" font-size="20" fill="white" text-anchor="middle" font-family="Arial"%3E商务正式风格%3C/text%3E%3Ctext x="50%25" y="55%25" font-size="16" fill="%2394a3b8" text-anchor="middle" font-family="Arial"%3E专业头像已生成%3C/text%3E%3C/svg%3E',
    creative: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Cdefs%3E%3ClinearGradient id="grad" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23ec4899;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%236366f1;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill="url(%23grad)" width="400" height="400"/%3E%3Ctext x="50%25" y="45%25" font-size="20" fill="white" text-anchor="middle" font-family="Arial"%3E创意活力风格%3C/text%3E%3Ctext x="50%25" y="55%25" font-size="16" fill="white" text-anchor="middle" font-family="Arial"%3E专业头像已生成%3C/text%3E%3C/svg%3E',
    artistic: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%231e293b" width="400" height="400"/%3E%3Ccircle cx="200" cy="200" r="100" fill="%23475569" opacity="0.3"/%3E%3Ctext x="50%25" y="45%25" font-size="20" fill="%23f1f5f9" text-anchor="middle" font-family="Arial"%3E艺术写真风格%3C/text%3E%3Ctext x="50%25" y="55%25" font-size="16" fill="%2394a3b8" text-anchor="middle" font-family="Arial"%3E专业头像已生成%3C/text%3E%3C/svg%3E'
};

// 初始化
function init() {
    setupEventListeners();
}

// 设置事件监听
function setupEventListeners() {
    // 上传区域点击
    elements.dropZone.addEventListener('click', () => {
        elements.fileInput.click();
    });

    // 文件选择
    elements.fileInput.addEventListener('change', handleFileSelect);

    // 拖拽事件
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);

    // 删除图片
    elements.removeImage.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUpload();
    });

    // 风格选择
    elements.styleCards.forEach(card => {
        card.addEventListener('click', () => handleStyleSelect(card));
    });

    // 生成按钮
    elements.generateBtn.addEventListener('click', handleGenerate);

    // 结果页按钮
    elements.downloadBtn.addEventListener('click', handleDownload);
    elements.regenerateBtn.addEventListener('click', handleRegenerate);
    elements.backToHomeBtn.addEventListener('click', handleBackToHome);
}

// 文件选择处理
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        validateAndPreviewFile(file);
    }
}

// 拖拽进入
function handleDragOver(e) {
    e.preventDefault();
    elements.dropZone.classList.add('drag-over');
}

// 拖拽离开
function handleDragLeave(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('drag-over');
}

// 拖拽放下
function handleDrop(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file) {
        validateAndPreviewFile(file);
    }
}

// 验证并预览文件
function validateAndPreviewFile(file) {
    // 清除之前的错误
    hideError();

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showError('不支持的文件格式。请上传 JPG、PNG 或 WEBP 格式的图片。');
        return;
    }

    // 验证文件大小 (10MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('文件大小超过限制。请上传小于 10MB 的图片。');
        return;
    }

    // 保存文件
    AppState.uploadedFile = file;

    // 预览图片
    const reader = new FileReader();
    reader.onload = (e) => {
        AppState.uploadedImageUrl = e.target.result;
        elements.previewImage.src = e.target.result;
        elements.previewSection.classList.remove('hidden');
        elements.dropZone.style.display = 'none';

        // 显示风格选择
        elements.styleSection.classList.remove('hidden');
        elements.generateSection.classList.remove('hidden');

        // 检查是否可以生成
        updateGenerateButton();
    };
    reader.readAsDataURL(file);
}

// 重置上传
function resetUpload() {
    AppState.uploadedFile = null;
    AppState.uploadedImageUrl = null;
    AppState.selectedStyle = null;

    elements.fileInput.value = '';
    elements.previewSection.classList.add('hidden');
    elements.dropZone.style.display = 'block';
    elements.styleSection.classList.add('hidden');
    elements.generateSection.classList.add('hidden');

    // 清除风格选择
    elements.styleCards.forEach(card => {
        card.classList.remove('selected');
    });

    hideError();
    updateGenerateButton();
}

// 风格选择处理
function handleStyleSelect(selectedCard) {
    // 移除其他卡片的选中状态
    elements.styleCards.forEach(card => {
        card.classList.remove('selected');
    });

    // 选中当前卡片
    selectedCard.classList.add('selected');
    AppState.selectedStyle = selectedCard.dataset.style;

    // 更新生成按钮状态
    updateGenerateButton();
}

// 更新生成按钮状态
function updateGenerateButton() {
    const canGenerate = AppState.uploadedFile && AppState.selectedStyle;
    elements.generateBtn.disabled = !canGenerate;
}

// 生成处理
async function handleGenerate() {
    if (!AppState.uploadedFile || !AppState.selectedStyle) {
        showError('请先上传照片并选择风格');
        return;
    }

    // 切换到生成中页面
    showPage('processing');
    hideError();

    try {
        // 调用真实 API
        const result = await callGenerateAPI(AppState.uploadedFile, AppState.selectedStyle);

        if (result.success) {
            AppState.generatedImageUrl = result.data.generated_url;
            showResultPage();
        } else {
            throw new Error(result.error || '生成失败');
        }
    } catch (error) {
        console.error('生成错误:', error);
        showError(error.message || '生成头像失败，请检查网络连接或稍后重试');
        showPage('upload');
    }
}

// 调用生成 API
async function callGenerateAPI(file, style) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('style', style);

    const response = await fetch(`${API_BASE_URL}/api/generate-avatar`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `服务器错误: ${response.status}`);
    }

    return await response.json();
}

// 显示结果页
function showResultPage() {
    elements.originalImage.src = AppState.uploadedImageUrl;
    elements.generatedImage.src = AppState.generatedImageUrl;
    showPage('result');
}

// 下载处理
function handleDownload() {
    const link = document.createElement('a');
    const timestamp = Date.now();
    link.download = `professional-avatar-${timestamp}.png`;
    link.href = AppState.generatedImageUrl;
    link.click();
}

// 重新生成
async function handleRegenerate() {
    if (!AppState.uploadedFile || !AppState.selectedStyle) {
        return;
    }

    // 切换到生成中页面
    showPage('processing');
    hideError();

    try {
        // 调用真实 API
        const result = await callGenerateAPI(AppState.uploadedFile, AppState.selectedStyle);

        if (result.success) {
            AppState.generatedImageUrl = result.data.generated_url;
            showResultPage();
        } else {
            throw new Error(result.error || '生成失败');
        }
    } catch (error) {
        console.error('重新生成错误:', error);
        showError(error.message || '重新生成失败，请稍后重试');
        showPage('result');
    }
}

// 返回首页
function handleBackToHome() {
    resetUpload();
    showPage('upload');
}

// 页面切换
function showPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // 显示目标页面
    switch(pageName) {
        case 'upload':
            elements.uploadPage.classList.add('active');
            break;
        case 'processing':
            elements.processingPage.classList.add('active');
            break;
        case 'result':
            elements.resultPage.classList.add('active');
            break;
    }
}

// 显示错误
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

// 隐藏错误
function hideError() {
    elements.errorMessage.classList.add('hidden');
    elements.errorMessage.textContent = '';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
