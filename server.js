const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = 6789; // 使用随机端口避免冲突

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
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

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 文件上传和二维码生成API
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const fileInfo = {
      id: path.parse(req.file.filename).name,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadTime: new Date().toISOString()
    };

    // 生成文件访问URL
    const fileUrl = `${req.protocol}://${req.get('host')}/file/${fileInfo.id}`;
    
    // 生成二维码
    const qrCodeDataURL = await QRCode.toDataURL(fileUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

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
      qrCode: qrCodeDataURL,
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
    
    const filePath = path.join(uploadsDir, fileInfo.filename);
    
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
