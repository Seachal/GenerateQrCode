// 二维码文件生成器前端脚本
class QRCodeGenerator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.setupDragAndDrop();
    }

    // 初始化DOM元素
    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.statusSection = document.getElementById('statusSection');
        this.statusText = document.getElementById('statusText');
        this.resultSection = document.getElementById('resultSection');
        this.newUploadBtn = document.getElementById('newUploadBtn');
        this.qrCodeImage = document.getElementById('qrCodeImage');
        this.downloadQRBtn = document.getElementById('downloadQRBtn');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
        this.notification = document.getElementById('notification');
        
        // 文件信息元素
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.fileType = document.getElementById('fileType');
        this.uploadTime = document.getElementById('uploadTime');
        this.accessUrl = document.getElementById('accessUrl');
    }

    // 绑定事件监听器
    bindEvents() {
        // 文件选择事件
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        
        // 按钮点击事件
        this.newUploadBtn.addEventListener('click', () => this.resetUpload());
        this.downloadQRBtn.addEventListener('click', () => this.downloadQRCode());
        this.copyLinkBtn.addEventListener('click', () => this.copyAccessLink());
        
        // 访问链接点击事件
        this.accessUrl.addEventListener('click', () => this.openAccessLink());
    }

    // 设置拖拽上传功能
    setupDragAndDrop() {
        // 阻止浏览器默认行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // 拖拽样式效果
        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => this.uploadArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadArea.addEventListener(eventName, () => this.uploadArea.classList.remove('dragover'), false);
        });

        // 处理文件拖拽
        this.uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e), false);
    }

    // 阻止默认行为
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // 处理文件拖拽放下
    handleFileDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    // 处理文件选择
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    // 处理文件上传
    async processFile(file) {
        try {
            // 显示加载状态
            this.showStatus('正在上传文件...');
            
            // 验证文件
            if (!this.validateFile(file)) {
                return;
            }

            // 创建FormData对象
            const formData = new FormData();
            formData.append('file', file);

            // 上传文件
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.hideStatus();
                this.showResult(result);
                this.showNotification('文件上传成功！', 'success');
            } else {
                throw new Error(result.error || '上传失败');
            }

        } catch (error) {
            console.error('上传错误:', error);
            this.hideStatus();
            this.showNotification('上传失败: ' + error.message, 'error');
        }
    }

    // 验证文件
    validateFile(file) {
        // 检查文件大小（100MB）
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('文件大小超过100MB限制', 'error');
            return false;
        }

        // 检查文件类型
        const allowedTypes = [
            // 图片
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
            // 视频
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv',
            // 音频
            'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 'audio/wma',
            // 文档
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'text/csv'
        ];

        if (!allowedTypes.includes(file.type)) {
            this.showNotification('不支持的文件格式', 'error');
            return false;
        }

        return true;
    }

    // 显示状态
    showStatus(message) {
        this.statusText.textContent = message;
        this.statusSection.style.display = 'block';
        this.resultSection.style.display = 'none';
        
        // 滚动到状态区域
        this.statusSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 隐藏状态
    hideStatus() {
        this.statusSection.style.display = 'none';
    }

    // 显示结果
    showResult(result) {
        const fileInfo = result.fileInfo;
        
        // 填充文件信息
        this.fileName.textContent = fileInfo.originalName;
        this.fileSize.textContent = this.formatFileSize(fileInfo.size);
        this.fileType.textContent = this.getFileTypeDescription(fileInfo.mimetype);
        this.uploadTime.textContent = this.formatDate(fileInfo.uploadTime);
        this.accessUrl.textContent = result.accessUrl;
        this.accessUrl.dataset.url = result.accessUrl;

        // 显示二维码
        this.qrCodeImage.src = result.qrCode;
        this.qrCodeImage.style.display = 'block';
        this.qrCodeImage.dataset.qrCode = result.qrCode;

        // 显示结果区域
        this.resultSection.style.display = 'block';
        
        // 滚动到结果区域
        this.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 重置上传
    resetUpload() {
        this.fileInput.value = '';
        this.statusSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 下载二维码
    downloadQRCode() {
        try {
            const qrCodeDataURL = this.qrCodeImage.dataset.qrCode;
            const fileName = this.fileName.textContent;
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = qrCodeDataURL;
            link.download = `QRCode_${fileName}_${Date.now()}.png`;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('二维码已保存到本地', 'success');
        } catch (error) {
            console.error('下载错误:', error);
            this.showNotification('下载失败', 'error');
        }
    }

    // 复制访问链接
    async copyAccessLink() {
        try {
            const url = this.accessUrl.dataset.url;
            await navigator.clipboard.writeText(url);
            this.showNotification('访问链接已复制到剪贴板', 'success');
        } catch (error) {
            console.error('复制错误:', error);
            // fallback方法
            this.fallbackCopyText(this.accessUrl.dataset.url);
        }
    }

    // 备用复制方法
    fallbackCopyText(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('访问链接已复制到剪贴板', 'success');
        } catch (error) {
            console.error('备用复制方法失败:', error);
            this.showNotification('复制失败，请手动复制链接', 'error');
        }
    }

    // 打开访问链接
    openAccessLink() {
        const url = this.accessUrl.dataset.url;
        window.open(url, '_blank');
    }

    // 显示通知消息
    showNotification(message, type = 'info') {
        const notification = this.notification;
        const icon = notification.querySelector('.notification-icon');
        const text = notification.querySelector('.notification-text');

        // 设置图标
        if (type === 'success') {
            icon.className = 'notification-icon fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'notification-icon fas fa-exclamation-circle';
        } else {
            icon.className = 'notification-icon fas fa-info-circle';
        }

        // 设置样式和文本
        notification.className = `notification ${type}`;
        text.textContent = message;

        // 显示通知
        notification.classList.add('show');

        // 3秒后自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取文件类型描述
    getFileTypeDescription(mimetype) {
        const typeMap = {
            // 图片
            'image/jpeg': '图片 (JPEG)',
            'image/jpg': '图片 (JPG)',
            'image/png': '图片 (PNG)',
            'image/gif': '图片 (GIF)',
            'image/webp': '图片 (WebP)',
            'image/bmp': '图片 (BMP)',
            'image/svg+xml': '图片 (SVG)',
            
            // 视频
            'video/mp4': '视频 (MP4)',
            'video/avi': '视频 (AVI)',
            'video/mov': '视频 (MOV)',
            'video/wmv': '视频 (WMV)',
            'video/flv': '视频 (FLV)',
            'video/webm': '视频 (WebM)',
            'video/mkv': '视频 (MKV)',
            
            // 音频
            'audio/mp3': '音频 (MP3)',
            'audio/wav': '音频 (WAV)',
            'audio/ogg': '音频 (OGG)',
            'audio/aac': '音频 (AAC)',
            'audio/flac': '音频 (FLAC)',
            'audio/m4a': '音频 (M4A)',
            'audio/wma': '音频 (WMA)',
            
            // 文档
            'application/pdf': '文档 (PDF)',
            'application/msword': '文档 (DOC)',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '文档 (DOCX)',
            'application/vnd.ms-excel': '文档 (XLS)',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '文档 (XLSX)',
            'text/plain': '文本 (TXT)',
            'text/csv': '文本 (CSV)'
        };
        
        return typeMap[mimetype] || mimetype;
    }

    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new QRCodeGenerator();
    
    // 添加一些视觉效果
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.upload-section, .supported-formats, .result-section');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // 初始设置动画样式
    const elements = document.querySelectorAll('.upload-section, .supported-formats, .result-section');
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    // 滚动动画
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // 初始调用
});

// 添加页面加载动画
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.5s ease';
});
