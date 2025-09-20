const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 6789; // 使用随机端口避免冲突

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// 初始化SQLite数据库
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 创建数据表
db.serialize(() => {
  // 文件信息表
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      student_name TEXT NOT NULL,
      category TEXT NOT NULL,
      relative_path TEXT NOT NULL
    )
  `);
  
  // 二维码表
  db.run(`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      qr_code_data TEXT NOT NULL,
      card_data TEXT,
      created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
    )
  `);
});

// 生成智能文件名
function generateSmartFilename(studentName, category, originalName, existingFiles = []) {
  const categoryNames = {
    'self': '自我介绍',
    'family': '家庭介绍',
    'career': '职业介绍'
  };
  
  const categoryName = categoryNames[category] || category;
  const extension = path.extname(originalName);
  const baseName = `${studentName}_${categoryName}`;
  
  // 检查是否存在同名文件
  let finalName = baseName;
  let counter = 1;
  
  while (existingFiles.some(file => file.startsWith(finalName + extension))) {
    finalName = `${baseName}_${counter}`;
    counter++;
  }
  
  return finalName + extension;
}

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
    // 创建临时目录，稍后在路由中移动到正确位置
    const tempDir = path.join(uploadsDir, 'temp');
    fs.ensureDirSync(tempDir);
    cb(null, tempDir);
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
    // 从数据库获取学生统计信息
    const students = await new Promise((resolve, reject) => {
      db.all(`
        SELECT student_name, category, COUNT(*) as count
        FROM files
        GROUP BY student_name, category
        ORDER BY student_name
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // 组织数据结构
    const studentMap = {};
    students.forEach(row => {
      if (!studentMap[row.student_name]) {
        studentMap[row.student_name] = {
          name: row.student_name,
          categories: {
            'self': 0,
            'family': 0,
            'career': 0
          }
        };
      }
      studentMap[row.student_name].categories[row.category] = row.count;
    });
    
    const studentList = Object.values(studentMap);
    
    res.json({ success: true, students: studentList });
  } catch (error) {
    console.error('获取学生列表错误:', error);
    res.status(500).json({ error: '获取学生列表失败' });
  }
});

// 获取学生详细文件信息API
app.get('/api/students/:studentName/files', requireAuth, async (req, res) => {
  try {
    const { studentName } = req.params;
    
    // 从数据库获取学生的所有文件
    const files = await new Promise((resolve, reject) => {
      db.all(`
        SELECT f.*, q.qr_code_data, q.card_data
        FROM files f
        LEFT JOIN qr_codes q ON f.id = q.file_id
        WHERE f.student_name = ?
        ORDER BY f.category, f.upload_time DESC
      `, [studentName], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // 按分类组织文件
    const studentFiles = {
      'self': [],
      'family': [],
      'career': []
    };
    
    files.forEach(file => {
      const categoryName = {
        'self': '自我介绍',
        'family': '家庭介绍',
        'career': '职业介绍'
      }[file.category];
      
      studentFiles[file.category].push({
        id: file.id,
        originalName: file.original_name,
        displayName: file.display_name,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        uploadTime: file.upload_time,
        studentName: file.student_name,
        category: file.category,
        categoryName: categoryName,
        relativePath: file.relative_path,
        qrCodeData: file.qr_code_data,
        cardData: file.card_data ? JSON.parse(file.card_data) : null
      });
    });
    
    res.json({ success: true, studentName, files: studentFiles });
  } catch (error) {
    console.error('获取学生文件错误:', error);
    res.status(500).json({ error: '获取学生文件失败' });
  }
});

// 删除文件API
app.delete('/api/files/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // 从数据库获取文件信息
    const fileInfo = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!fileInfo) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 删除实际文件
    const filePath = path.join(uploadsDir, fileInfo.relative_path);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
    
    // 从数据库中删除记录（级联删除二维码记录）
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM files WHERE id = ?', [fileId], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    
    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    console.error('删除文件错误:', error);
    res.status(500).json({ error: '删除文件失败' });
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

    // 创建目标目录
    const targetDir = path.join(uploadsDir, 'students', studentName, category);
    fs.ensureDirSync(targetDir);
    
    // 获取现有文件列表以避免重名
    const existingFiles = await fs.readdir(targetDir).catch(() => []);
    
    // 生成智能文件名
    const smartFilename = generateSmartFilename(studentName, category, req.file.originalname, existingFiles);
    
    // 移动文件从临时目录到目标目录，使用新文件名
    const tempFilePath = req.file.path;
    const targetFilePath = path.join(targetDir, smartFilename);
    await fs.move(tempFilePath, targetFilePath);

    const fileId = uuidv4();
    const fileInfo = {
      id: fileId,
      originalName: req.file.originalname,
      displayName: smartFilename,
      filename: smartFilename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadTime: new Date().toISOString(),
      studentName: studentName,
      category: category,
      relativePath: path.join('students', studentName, category, smartFilename)
    };

    // 生成文件访问URL
    const fileUrl = `${req.protocol}://${req.get('host')}/file/${fileInfo.id}`;
    
    // 生成美化的二维码卡片
    const qrCardData = await generateQRCodeCard(fileUrl, studentName, category);

    // 保存到数据库
    await new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO files (id, original_name, display_name, filename, mimetype, size, 
                          upload_time, student_name, category, relative_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        fileInfo.id, fileInfo.originalName, fileInfo.displayName, fileInfo.filename,
        fileInfo.mimetype, fileInfo.size, fileInfo.uploadTime, fileInfo.studentName,
        fileInfo.category, fileInfo.relativePath
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
      
      stmt.finalize();
    });

    // 保存二维码信息
    const qrId = uuidv4();
    await new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO qr_codes (id, file_id, qr_code_data, card_data)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run([qrId, fileInfo.id, qrCardData.qrCode, JSON.stringify(qrCardData)], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
      
      stmt.finalize();
    });

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
    
    // 从数据库查询文件信息
    const fileInfo = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM files WHERE id = ?', [fileId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!fileInfo) {
      // 尝试从旧的JSON文件中查找（向后兼容）
      const dataFile = path.join(__dirname, 'data.json');
      if (await fs.pathExists(dataFile)) {
        const data = await fs.readJson(dataFile);
        const oldFileInfo = data[fileId];
        if (oldFileInfo) {
          let filePath;
          if (oldFileInfo.relativePath) {
            filePath = path.join(uploadsDir, oldFileInfo.relativePath);
          } else {
            filePath = path.join(uploadsDir, oldFileInfo.filename);
          }
          
          if (await fs.pathExists(filePath)) {
            res.setHeader('Content-Type', oldFileInfo.mimetype);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(oldFileInfo.originalName)}"`);
            return res.sendFile(filePath);
          }
        }
      }
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 构建文件路径
    const filePath = path.join(uploadsDir, fileInfo.relative_path);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: '文件已被删除' });
    }
    
    // 根据文件类型设置响应头
    res.setHeader('Content-Type', fileInfo.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.display_name)}"`);
    
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
