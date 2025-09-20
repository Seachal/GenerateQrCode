const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const session = require('express-session');

const app = express();
const PORT = 6789; // 使用随机端口避免冲突

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// 管理员账户配置
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin0803'
};

// 学生分类配置
const STUDENT_CATEGORIES = {
  SELF_INTRO: 'self',
  FAMILY_INTRO: 'family', 
  CAREER_INTRO: 'career'
};

// 配置会话管理
app.use(session({
  secret: 'qrcode-generator-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // 本地开发环境设为false
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 登录验证中间件
const requireAuth = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  return res.status(401).json({ error: '需要登录访问', requireLogin: true });
};

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据学生姓名和分类创建目录结构
    const studentName = req.body.studentName || 'unknown';
    const category = req.body.category || 'self';
    const studentDir = path.join(uploadsDir, 'students', studentName, category);
    
    // 确保目录存在
    fs.ensureDirSync(studentDir);
    cb(null, studentDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名，保留原始扩展名
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  }
});

// 支持的文件类型
const allowedMimeTypes = [
  // 图片格式
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
  // 视频格式
  'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv',
  // 音频格式
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a', 'audio/wma',
  // 文档格式
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件格式'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 限制文件大小为100MB
  }
});

// 中间件
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// 登录API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    req.session.isAuthenticated = true;
    req.session.username = username;
    res.json({ success: true, message: '登录成功' });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// 退出登录API
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '退出登录失败' });
    }
    res.json({ success: true, message: '已退出登录' });
  });
});

// 检查登录状态API
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    res.json({ 
      authenticated: true, 
      username: req.session.username 
    });
  } else {
    res.json({ authenticated: false });
  }
});

// 获取学生列表API
app.get('/api/students', requireAuth, async (req, res) => {
  try {
    const studentsDir = path.join(uploadsDir, 'students');
    
    if (!await fs.pathExists(studentsDir)) {
      return res.json({ success: true, students: [] });
    }
    
    const studentNames = await fs.readdir(studentsDir);
    const students = [];
    
    for (const studentName of studentNames) {
      const studentPath = path.join(studentsDir, studentName);
      const stat = await fs.stat(studentPath);
      
      if (stat.isDirectory()) {
        // 获取学生的各个分类
        const categories = {};
        for (const [key, categoryDir] of Object.entries(STUDENT_CATEGORIES)) {
          const categoryPath = path.join(studentPath, categoryDir);
          if (await fs.pathExists(categoryPath)) {
            const files = await fs.readdir(categoryPath);
            categories[categoryDir] = files.length;
          } else {
            categories[categoryDir] = 0;
          }
        }
        
        students.push({
          name: studentName,
          categories: categories
        });
      }
    }
    
    res.json({ success: true, students: students });
  } catch (error) {
    console.error('获取学生列表错误:', error);
    res.status(500).json({ error: '获取学生列表失败' });
  }
});

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 生成美化二维码（临时使用SVG方案）
async function generateQRCodeCard(url, studentName, category) {
  // 生成基础二维码
  const qrCodeDataURL = await QRCode.toDataURL(url, {
    width: 256,
    margin: 2,
    color: {
      dark: '#333333',
      light: '#FFFFFF'
    }
  });
  
  // 创建SVG卡片
  const categoryNames = {
    'self': '自我介绍',
    'family': '家庭介绍', 
    'career': '职业介绍'
  };
  
  const titleText = `${studentName}的${categoryNames[category] || '介绍'}`;
  
  const svgCard = `
    <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
      <!-- 背景渐变 -->
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#FFE5E5;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FFF0E5;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- 背景 -->
      <rect width="400" height="500" fill="url(#bg)"/>
      
      <!-- 装饰边框 -->
      <rect x="10" y="10" width="380" height="480" fill="none" stroke="#FF9999" stroke-width="3"/>
      
      <!-- 标题 -->
      <text x="200" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333333">${titleText}</text>
      
      <!-- 二维码背景 -->
      <rect x="90" y="120" width="220" height="220" fill="#FFFFFF" stroke="#E0E0E0" stroke-width="1"/>
      
      <!-- 二维码图片占位符（需要前端替换） -->
      <foreignObject x="100" y="130" width="200" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border:1px solid #ddd;">
          <span style="color:#666;font-size:12px;">二维码占位</span>
        </div>
      </foreignObject>
      
      <!-- 提示文字 -->
      <text x="200" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#FF6B6B">扫描查看详情</text>
      
      <!-- 装饰圆点 -->
      <circle cx="50" cy="80" r="8" fill="#FFB3B3"/>
      <circle cx="350" cy="80" r="8" fill="#FFB3B3"/>
      <circle cx="120" cy="430" r="5" fill="#FFB3B3"/>
      <circle cx="160" cy="430" r="5" fill="#FFB3B3"/>
      <circle cx="200" cy="430" r="5" fill="#FFB3B3"/>
      <circle cx="240" cy="430" r="5" fill="#FFB3B3"/>
      <circle cx="280" cy="430" r="5" fill="#FFB3B3"/>
    </svg>
  `;
  
  // 返回包含二维码和标题信息的对象，让前端处理合成
  return {
    qrCode: qrCodeDataURL,
    title: titleText,
    svgTemplate: svgCard
  };
}

// 文件上传和二维码生成API（需要登录）
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const { studentName, category } = req.body;
    
    if (!studentName) {
      return res.status(400).json({ error: '请选择学生姓名' });
    }
    
    if (!category || !Object.values(STUDENT_CATEGORIES).includes(category)) {
      return res.status(400).json({ error: '请选择有效的分类' });
    }

    const fileInfo = {
      id: path.parse(req.file.filename).name,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadTime: new Date().toISOString(),
      studentName: studentName,
      category: category,
      relativePath: path.join('students', studentName, category, req.file.filename)
    };

    // 生成文件访问URL
    const fileUrl = `${req.protocol}://${req.get('host')}/file/${fileInfo.id}`;
    
    // 生成美化的二维码卡片
    const qrCardData = await generateQRCodeCard(fileUrl, studentName, category);

    // 保存文件信息到简单的JSON数据库
    const dataFile = path.join(__dirname, 'data.json');
    let data = {};
    
    if (await fs.pathExists(dataFile)) {
      data = await fs.readJson(dataFile);
    }
    
    data[fileInfo.id] = fileInfo;
    await fs.writeJson(dataFile, data, { spaces: 2 });

    res.json({
      success: true,
      fileInfo: fileInfo,
      qrCode: qrCardData.qrCode,
      qrCardData: qrCardData,
      accessUrl: fileUrl
    });

  } catch (error) {
    console.error('上传文件错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 文件访问路由 - 通过ID访问文件
app.get('/file/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    const dataFile = path.join(__dirname, 'data.json');
    
    if (!await fs.pathExists(dataFile)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const data = await fs.readJson(dataFile);
    const fileInfo = data[fileId];
    
    if (!fileInfo) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 优先使用相对路径，向后兼容旧文件
    let filePath;
    if (fileInfo.relativePath) {
      filePath = path.join(uploadsDir, fileInfo.relativePath);
    } else {
      filePath = path.join(uploadsDir, fileInfo.filename);
    }
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: '文件已被删除' });
    }
    
    // 根据文件类型设置响应头
    res.setHeader('Content-Type', fileInfo.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.originalName)}"`);
    
    // 发送文件
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('访问文件错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取文件信息API
app.get('/api/file/:id/info', async (req, res) => {
  try {
    const fileId = req.params.id;
    const dataFile = path.join(__dirname, 'data.json');
    
    if (!await fs.pathExists(dataFile)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    const data = await fs.readJson(dataFile);
    const fileInfo = data[fileId];
    
    if (!fileInfo) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.json({ success: true, fileInfo: fileInfo });
    
  } catch (error) {
    console.error('获取文件信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制（最大100MB）' });
    }
  }
  
  if (error.message === '不支持的文件格式') {
    return res.status(400).json({ error: '不支持的文件格式' });
  }
  
  console.error('服务器错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 二维码文件生成器服务器已启动`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`📁 文件存储目录: ${uploadsDir}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});
