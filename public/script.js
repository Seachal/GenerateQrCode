// 学生介绍二维码生成器前端脚本
class StudentQRCodeGenerator {
    constructor() {
        this.isAuthenticated = false;
        this.currentStudent = null;
        this.initializeElements();
        this.bindEvents();
        this.setupDragAndDrop();
        this.checkAuthStatus();
    }

    // 初始化DOM元素
    initializeElements() {
        // 认证相关元素
        this.loginBtn = document.getElementById('loginBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.userInfo = document.getElementById('userInfo');
        this.loginSection = document.getElementById('loginSection');
        this.loginForm = document.getElementById('loginForm');
        this.cancelLoginBtn = document.getElementById('cancelLoginBtn');
        this.usernameInput = document.getElementById('usernameInput');
        this.passwordInput = document.getElementById('passwordInput');
        
        // 学生管理元素
        this.studentManagement = document.getElementById('studentManagement');
        this.studentsGrid = document.getElementById('studentsGrid');
        this.refreshStudentsBtn = document.getElementById('refreshStudentsBtn');
        
        // 上传相关元素
        this.uploadSection = document.getElementById('uploadSection');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.studentNameInput = document.getElementById('studentNameInput');
        this.categorySelect = document.getElementById('categorySelect');
        
        // 状态和结果元素
        this.statusSection = document.getElementById('statusSection');
        this.statusText = document.getElementById('statusText');
        this.resultSection = document.getElementById('resultSection');
        this.newUploadBtn = document.getElementById('newUploadBtn');
        this.backToManagementBtn = document.getElementById('backToManagementBtn');
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
        
        // 模态框元素
        this.studentFilesModal = document.getElementById('studentFilesModal');
        this.modalStudentName = document.getElementById('modalStudentName');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.fileCategoriesContainer = document.getElementById('fileCategoriesContainer');
        
        // 快速查看模态框元素
        this.quickViewModal = document.getElementById('quickViewModal');
        this.quickViewTitle = document.getElementById('quickViewTitle');
        this.closeQuickViewBtn = document.getElementById('closeQuickViewBtn');
        this.quickViewFiles = document.getElementById('quickViewFiles');
        this.qrPreview = document.getElementById('qrPreview');
    }

    // 绑定事件监听器
    bindEvents() {
        // 认证相关事件
        this.loginBtn.addEventListener('click', () => this.showLoginForm());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.cancelLoginBtn.addEventListener('click', () => this.hideLoginForm());
        
        // 学生管理事件
        this.refreshStudentsBtn.addEventListener('click', () => this.loadStudents());
        
        // 文件上传事件
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        
        // 按钮点击事件
        this.newUploadBtn.addEventListener('click', () => this.showUploadForm());
        this.backToManagementBtn.addEventListener('click', () => this.showStudentManagement());
        this.downloadQRBtn.addEventListener('click', () => this.downloadQRCode());
        this.copyLinkBtn.addEventListener('click', () => this.copyAccessLink());
        
        // 访问链接点击事件
        this.accessUrl.addEventListener('click', () => this.openAccessLink());
        
        // 模态框事件
        this.closeModalBtn.addEventListener('click', () => this.closeStudentFilesModal());
        this.studentFilesModal.addEventListener('click', (e) => {
            if (e.target === this.studentFilesModal) {
                this.closeStudentFilesModal();
            }
        });
        
        // 快速查看模态框事件
        this.closeQuickViewBtn.addEventListener('click', () => this.closeQuickViewModal());
        this.quickViewModal.addEventListener('click', (e) => {
            if (e.target === this.quickViewModal) {
                this.closeQuickViewModal();
            }
        });
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

    // 检查认证状态
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const result = await response.json();
            
            if (result.authenticated) {
                this.isAuthenticated = true;
                this.showAuthenticatedState(result.username);
                this.loadStudents();
            } else {
                this.isAuthenticated = false;
                this.showUnauthenticatedState();
            }
        } catch (error) {
            console.error('检查认证状态错误:', error);
            this.isAuthenticated = false;
            this.showUnauthenticatedState();
        }
    }

    // 显示登录表单
    showLoginForm() {
        this.loginSection.style.display = 'block';
        this.usernameInput.focus();
    }

    // 隐藏登录表单
    hideLoginForm() {
        this.loginSection.style.display = 'none';
        this.usernameInput.value = '';
        this.passwordInput.value = '';
    }

    // 处理登录
    async handleLogin(e) {
        e.preventDefault();
        
        const username = this.usernameInput.value;
        const password = this.passwordInput.value;
        
        if (!username || !password) {
            this.showNotification('请输入用户名和密码', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isAuthenticated = true;
                this.showAuthenticatedState(username);
                this.hideLoginForm();
                this.loadStudents();
                this.showNotification('登录成功！', 'success');
            } else {
                this.showNotification(result.error || '登录失败', 'error');
            }
        } catch (error) {
            console.error('登录错误:', error);
            this.showNotification('登录失败，请检查网络连接', 'error');
        }
    }

    // 退出登录
    async logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isAuthenticated = false;
                this.showUnauthenticatedState();
                this.showNotification('已退出登录', 'success');
            }
        } catch (error) {
            console.error('退出登录错误:', error);
            this.showNotification('退出登录失败', 'error');
        }
    }

    // 显示已认证状态
    showAuthenticatedState(username) {
        this.loginBtn.style.display = 'none';
        this.userInfo.style.display = 'flex';
        this.userInfo.querySelector('#username').textContent = username;
        this.studentManagement.style.display = 'block';
        this.hideAllSections();
    }

    // 显示未认证状态
    showUnauthenticatedState() {
        this.loginBtn.style.display = 'inline-block';
        this.userInfo.style.display = 'none';
        this.hideAllSections();
    }

    // 隐藏所有内容区域
    hideAllSections() {
        this.loginSection.style.display = 'none';
        this.uploadSection.style.display = 'none';
        this.statusSection.style.display = 'none';
        this.resultSection.style.display = 'none';
    }

    // 加载学生列表
    async loadStudents() {
        try {
            const response = await fetch('/api/students');
            const result = await response.json();
            
            if (result.success) {
                this.renderStudentsGrid(result.students);
            } else {
                this.showNotification(result.error || '加载学生列表失败', 'error');
            }
        } catch (error) {
            console.error('加载学生列表错误:', error);
            this.showNotification('加载学生列表失败', 'error');
        }
    }

    // 渲染学生网格
    renderStudentsGrid(students) {
        const grid = this.studentsGrid;
        grid.innerHTML = '';
        
        // 添加新建学生卡片
        const addStudentCard = document.createElement('div');
        addStudentCard.className = 'student-card add-student-card';
        addStudentCard.innerHTML = `
            <div class="add-student-content">
                <i class="fas fa-plus-circle add-icon"></i>
                <h4>添加新学生</h4>
                <p>点击上传学生介绍文件</p>
            </div>
        `;
        addStudentCard.addEventListener('click', () => this.showUploadForm());
        grid.appendChild(addStudentCard);
        
        // 添加现有学生卡片
        students.forEach(student => {
            const studentCard = document.createElement('div');
            studentCard.className = 'student-card';
            
            const categoryLabels = {
                'self': '自我介绍',
                'family': '家庭介绍',
                'career': '职业介绍'
            };
            
            const categoriesHtml = Object.entries(student.categories).map(([category, count]) => {
                const label = categoryLabels[category] || category;
                const badgeClass = count > 0 ? 'has-files' : 'no-files';
                const quickViewBtn = count > 0 ? 
                    `<button class="quick-view-btn" data-student="${student.name}" data-category="${category}" title="快速查看">
                        <i class="fas fa-eye"></i>
                    </button>` : '';
                return `
                    <div class="category-item">
                        <span class="category-badge ${badgeClass}">${label} (${count})</span>
                        ${quickViewBtn}
                    </div>
                `;
            }).join('');
            
            studentCard.innerHTML = `
                <div class="student-info">
                    <h4><i class="fas fa-user-graduate"></i> ${student.name}</h4>
                    <div class="categories">
                        ${categoriesHtml}
                    </div>
                    <div class="student-actions">
                        <button class="upload-for-student-btn" data-student="${student.name}">
                            <i class="fas fa-upload"></i> 上传文件
                        </button>
                        <button class="manage-student-btn" data-student="${student.name}">
                            <i class="fas fa-cog"></i> 管理文件
                        </button>
                    </div>
                </div>
            `;
            
            const uploadBtn = studentCard.querySelector('.upload-for-student-btn');
            const manageBtn = studentCard.querySelector('.manage-student-btn');
            const quickViewBtns = studentCard.querySelectorAll('.quick-view-btn');
            
            uploadBtn.addEventListener('click', () => {
                this.showUploadForm(student.name);
            });
            
            manageBtn.addEventListener('click', () => {
                this.showStudentFilesModal(student.name);
            });
            
            // 为快速查看按钮添加事件监听器
            quickViewBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const studentName = btn.dataset.student;
                    const category = btn.dataset.category;
                    this.showQuickViewModal(studentName, category);
                });
            });
            
            grid.appendChild(studentCard);
        });
    }

    // 显示上传表单
    showUploadForm(studentName = '') {
        this.hideAllSections();
        this.uploadSection.style.display = 'block';
        
        if (studentName) {
            this.studentNameInput.value = studentName;
            this.currentStudent = studentName;
        } else {
            this.studentNameInput.value = '';
            this.currentStudent = null;
        }
        
        this.categorySelect.value = '';
        this.fileInput.value = '';
        
        // 滚动到上传区域
        this.uploadSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 显示学生管理页面
    showStudentManagement() {
        this.hideAllSections();
        this.studentManagement.style.display = 'block';
        this.loadStudents();
        
        // 滚动到管理区域
        this.studentManagement.scrollIntoView({ behavior: 'smooth' });
    }

    // 处理文件上传
    async processFile(file) {
        try {
            // 显示加载状态
            this.showStatus('正在上传文件...');
            
            // 验证登录状态
            if (!this.isAuthenticated) {
                this.hideStatus();
                this.showNotification('请先登录', 'error');
                return;
            }

            // 验证学生信息
            const studentName = this.studentNameInput.value.trim();
            const category = this.categorySelect.value;

            if (!studentName) {
                this.hideStatus();
                this.showNotification('请输入学生姓名', 'error');
                return;
            }

            if (!category) {
                this.hideStatus();
                this.showNotification('请选择分类', 'error');
                return;
            }

            // 验证文件
            if (!this.validateFile(file)) {
                return;
            }

            // 创建FormData对象
            const formData = new FormData();
            formData.append('file', file);
            formData.append('studentName', studentName);
            formData.append('category', category);

            // 上传文件
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.hideStatus();
                this.showResult(result);
                this.showNotification(`${studentName}的${this.getCategoryName(category)}上传成功！`, 'success');
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
            // 与后端保持一致的更全白名单
            'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/opus',
            'audio/aac', 'audio/flac', 'audio/x-flac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4',
            'audio/wma', 'audio/x-ms-wma', 'audio/webm', 'audio/aiff', 'audio/x-aiff',
            'audio/3gpp', 'audio/3gpp2', 'audio/amr',
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
        this.fileName.textContent = fileInfo.displayName || fileInfo.originalName;
        this.fileSize.textContent = this.formatFileSize(fileInfo.size);
        this.fileType.textContent = this.getFileTypeDescription(fileInfo.mimetype);
        this.uploadTime.textContent = this.formatDate(fileInfo.uploadTime);
        this.accessUrl.textContent = result.accessUrl;
        this.accessUrl.dataset.url = result.accessUrl;

        // 如果有卡片数据，生成美化卡片；否则使用普通二维码
        if (result.qrCardData) {
            this.generateQRCard(result.qrCardData);
        } else {
            // 显示普通二维码
            this.qrCodeImage.src = result.qrCode;
            this.qrCodeImage.style.display = 'block';
            this.qrCodeImage.dataset.qrCode = result.qrCode;
        }

        // 显示结果区域
        this.resultSection.style.display = 'block';
        
        // 滚动到结果区域
        this.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 生成美化二维码卡片（前端Canvas实现）
    generateQRCard(qrCardData) {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');
        
        // 设置背景渐变
        const gradient = ctx.createLinearGradient(0, 0, 0, 500);
        gradient.addColorStop(0, '#FFE5E5');
        gradient.addColorStop(1, '#FFF0E5');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 500);
        
        // 添加装饰边框
        ctx.strokeStyle = '#FF9999';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, 380, 480);
        
        // 设置字体和标题
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(qrCardData.title, 200, 50);
        
        // 绘制二维码背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(90, 120, 220, 220);
        
        // 加载并绘制二维码
        const qrImage = new Image();
        qrImage.onload = () => {
            ctx.drawImage(qrImage, 100, 130, 200, 200);
            
            // 添加提示文字
            ctx.fillStyle = '#FF6B6B';
            ctx.font = '16px Arial';
            ctx.fillText('扫描查看详情', 200, 380);
            
            // 添加装饰圆点
            ctx.fillStyle = '#FFB3B3';
            ctx.beginPath();
            ctx.arc(50, 80, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(350, 80, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // 底部装饰
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(120 + i * 40, 430, 5, 0, 2 * Math.PI);
                ctx.fill();
            }
            
            // 将canvas转换为图片并显示
            const cardDataURL = canvas.toDataURL();
            this.qrCodeImage.src = cardDataURL;
            this.qrCodeImage.style.display = 'block';
            this.qrCodeImage.dataset.qrCode = cardDataURL;
        };
        
        qrImage.crossOrigin = 'anonymous';
        qrImage.src = qrCardData.qrCode;
    }

    // 重置上传
    resetUpload() {
        this.showUploadForm(this.currentStudent);
    }

    // 获取分类名称
    getCategoryName(category) {
        const categoryNames = {
            'self': '自我介绍',
            'family': '家庭介绍',
            'career': '职业介绍'
        };
        return categoryNames[category] || category;
    }

    // 显示学生文件管理模态框
    async showStudentFilesModal(studentName) {
        try {
            this.modalStudentName.textContent = `${studentName} - 文件管理`;
            this.studentFilesModal.style.display = 'flex';
            
            // 加载学生文件数据
            const response = await fetch(`/api/students/${encodeURIComponent(studentName)}/files`);
            const result = await response.json();
            
            if (result.success) {
                this.renderStudentFiles(result.files);
            } else {
                this.showNotification(result.error || '加载文件失败', 'error');
            }
        } catch (error) {
            console.error('加载学生文件错误:', error);
            this.showNotification('加载文件失败', 'error');
        }
    }

    // 关闭学生文件管理模态框
    closeStudentFilesModal() {
        this.studentFilesModal.style.display = 'none';
    }

    // 显示快速查看模态框
    async showQuickViewModal(studentName, category) {
        try {
            const categoryLabels = {
                'self': '自我介绍',
                'family': '家庭介绍',
                'career': '职业介绍'
            };
            
            const categoryLabel = categoryLabels[category] || category;
            this.quickViewTitle.textContent = `${studentName} - ${categoryLabel}`;
            this.quickViewModal.style.display = 'flex';
            
            // 加载学生文件数据
            const response = await fetch(`/api/students/${encodeURIComponent(studentName)}/files`);
            const result = await response.json();
            
            if (result.success) {
                // 过滤指定分类的文件
                const categoryFiles = result.files[category] || [];
                this.renderQuickViewFiles(categoryFiles, categoryLabel);
            } else {
                this.showNotification(result.error || '加载文件失败', 'error');
            }
        } catch (error) {
            console.error('加载文件错误:', error);
            this.showNotification('加载文件失败', 'error');
        }
    }

    // 关闭快速查看模态框
    closeQuickViewModal() {
        this.quickViewModal.style.display = 'none';
        this.qrPreview.innerHTML = '';
    }

    // 渲染快速查看文件列表
    renderQuickViewFiles(files, categoryLabel) {
        this.quickViewFiles.innerHTML = '';
        
        if (files.length === 0) {
            this.quickViewFiles.innerHTML = '<div class="no-files">该分类下暂无文件</div>';
            return;
        }
        
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'quick-view-file-item';
            
            const fileIcon = this.getFileIcon(file.mimetype);
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="${fileIcon}"></i>
                    <div class="file-details">
                        <span class="file-name">${file.displayName || file.display_name}</span>
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="action-btn view-btn" data-file-id="${file.id}" title="查看文件">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn qr-btn" data-file-id="${file.id}" title="查看二维码">
                        <i class="fas fa-qrcode"></i>
                    </button>
                </div>
            `;
            
            // 为查看和二维码按钮添加事件监听器
            const viewBtn = fileItem.querySelector('.view-btn');
            const qrBtn = fileItem.querySelector('.qr-btn');
            
            // 将“查看”按钮与“二维码”体验统一：直接展示二维码结果页
            viewBtn.addEventListener('click', () => {
                this.showFileQRCode(file);
            });
            
            qrBtn.addEventListener('click', () => {
                this.showQuickViewQRCode(file);
            });
            
            this.quickViewFiles.appendChild(fileItem);
        });
        
        // 默认显示第一个文件的二维码
        if (files.length > 0) {
            this.showQuickViewQRCode(files[0]);
        }
    }

    // 显示快速查看二维码
    showQuickViewQRCode(file) {
        if (file.qrCodeData && file.cardData) {
            try {
                const cardData = JSON.parse(file.cardData);
                this.generateQRCard(cardData.qrCode, cardData, this.qrPreview);
            } catch (error) {
                console.error('解析二维码数据错误:', error);
                // 降级到基本二维码
                this.generateBasicQRCode(`${window.location.origin}/file/${file.id}`, this.qrPreview);
            }
        } else {
            // 生成基本二维码
            this.generateBasicQRCode(`${window.location.origin}/file/${file.id}`, this.qrPreview);
        }
    }

    // 渲染学生文件列表
    renderStudentFiles(files) {
        const container = this.fileCategoriesContainer;
        container.innerHTML = '';
        
        const categoryLabels = {
            'self': '自我介绍',
            'family': '家庭介绍',
            'career': '职业介绍'
        };
        
        Object.entries(files).forEach(([category, fileList]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'file-category';
            
            const categoryLabel = categoryLabels[category] || category;
            
            categoryDiv.innerHTML = `
                <div class="category-header">
                    <h4><i class="fas fa-folder"></i> ${categoryLabel}</h4>
                    <span class="file-count">${fileList.length} 个文件</span>
                </div>
                <div class="file-list" id="fileList-${category}">
                    ${fileList.length === 0 ? '<p class="no-files">暂无文件</p>' : ''}
                </div>
            `;
            
            const fileListContainer = categoryDiv.querySelector(`#fileList-${category}`);
            
            fileList.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                
                const uploadDate = new Date(file.uploadTime).toLocaleString('zh-CN');
                const fileSize = this.formatFileSize(file.size);
                
                fileItem.innerHTML = `
                    <div class="file-info">
                        <div class="file-icon">
                            ${this.getFileIcon(file.mimetype)}
                        </div>
                        <div class="file-details">
                            <h5>${file.displayName || file.originalName}</h5>
                            <p>大小: ${fileSize} | 上传时间: ${uploadDate}</p>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="action-btn view-btn" data-file-id="${file.id}">
                            <i class="fas fa-eye"></i> 查看
                        </button>
                        <button class="action-btn qr-btn" data-file-id="${file.id}">
                            <i class="fas fa-qrcode"></i> 二维码
                        </button>
                        <button class="action-btn delete-btn" data-file-id="${file.id}">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                `;
                
                // 绑定事件
                const viewBtn = fileItem.querySelector('.view-btn');
                const qrBtn = fileItem.querySelector('.qr-btn');
                const deleteBtn = fileItem.querySelector('.delete-btn');
                
                viewBtn.addEventListener('click', () => {
                    window.open(`/file/${file.id}`, '_blank');
                });
                qrBtn.addEventListener('click', () => this.showFileQRCode(file));
                deleteBtn.addEventListener('click', () => this.deleteFile(file.id, fileItem));
                
                fileListContainer.appendChild(fileItem);
            });
            
            container.appendChild(categoryDiv);
        });
    }

    // 获取文件图标
    getFileIcon(mimetype) {
        if (mimetype.startsWith('image/')) return '<i class="fas fa-image"></i>';
        if (mimetype.startsWith('video/')) return '<i class="fas fa-video"></i>';
        if (mimetype.startsWith('audio/')) return '<i class="fas fa-music"></i>';
        if (mimetype.includes('pdf')) return '<i class="fas fa-file-pdf"></i>';
        if (mimetype.includes('word')) return '<i class="fas fa-file-word"></i>';
        if (mimetype.includes('excel') || mimetype.includes('sheet')) return '<i class="fas fa-file-excel"></i>';
        return '<i class="fas fa-file"></i>';
    }

    // 显示文件二维码
    async showFileQRCode(file) {
        try {
            // 关闭模态框并显示结果
            this.closeStudentFilesModal();
            
            const fileUrl = `${window.location.origin}/file/${file.id}`;
            
            // 使用已保存的二维码数据，如果没有则重新生成
            let qrCardData;
            if (file.cardData) {
                qrCardData = file.cardData;
            } else {
                // 如果没有保存的二维码数据，重新生成
                qrCardData = {
                    qrCode: file.qrCodeData || await this.generateBasicQRCode(fileUrl),
                    title: `${file.studentName}的${file.categoryName}`
                };
            }
            
            // 构建结果数据结构
            const result = {
                fileInfo: file,
                qrCardData: qrCardData,
                accessUrl: fileUrl
            };
            
            this.showResult(result);
            
        } catch (error) {
            console.error('显示二维码错误:', error);
            this.showNotification('显示二维码失败', 'error');
        }
    }

    // 生成基础二维码
    async generateBasicQRCode(url) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 使用简单的方法创建二维码占位符
            // 实际项目中这里应该调用QR码生成库
            canvas.width = 256;
            canvas.height = 256;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('二维码', 128, 128);
            
            resolve(canvas.toDataURL());
        });
    }

    // 删除文件
    async deleteFile(fileId, fileItem) {
        if (!confirm('确定要删除这个文件吗？删除后无法恢复。')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                fileItem.remove();
                this.showNotification('文件删除成功', 'success');
                
                // 刷新学生管理列表
                this.loadStudents();
            } else {
                this.showNotification(result.error || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除文件错误:', error);
            this.showNotification('删除文件失败', 'error');
        }
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
            
            this.showNotification('学生介绍卡片已保存到本地', 'success');
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
    new StudentQRCodeGenerator();
    
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
