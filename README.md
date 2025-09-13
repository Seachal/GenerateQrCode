# 二维码文件生成器 | QR Code File Generator

一个功能强大的二维码生成网站，支持多种文件格式上传并生成二维码供手机扫描查看。

## 🚀 功能特色

- ✅ **多格式支持**：支持图片、视频、音频、文档等多种文件格式
- ✅ **二维码生成**：自动为上传的文件生成高清二维码
- ✅ **手机扫码**：支持手机扫描二维码直接查看文件
- ✅ **本地保存**：支持将生成的二维码保存到本地
- ✅ **无限制使用**：无扫码次数限制，文件永久保存
- ✅ **响应式设计**：完美适配桌面端和移动端
- ✅ **拖拽上传**：支持拖拽文件上传，操作便捷

## 📋 支持的文件格式

### 图片格式
- JPEG/JPG, PNG, GIF, WebP, BMP, SVG

### 视频格式  
- MP4, AVI, MOV, WMV, FLV, WebM, MKV

### 音频格式
- MP3, WAV, OGG, AAC, FLAC, M4A, WMA

### 文档格式
- PDF, DOC, DOCX, XLS, XLSX, TXT, CSV

## 🛠️ 技术架构

```mermaid
graph TB
    A[前端 HTML/CSS/JS] --> B[Express.js 服务器]
    B --> C[Multer 文件上传]
    B --> D[QRCode 二维码生成]
    B --> E[文件系统存储]
    B --> F[JSON 数据库]
    
    G[用户上传文件] --> A
    A --> H[显示二维码]
    I[手机扫码] --> B
    B --> J[返回文件内容]
```

## 📦 安装与运行

### 环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0

### 1. 克隆或下载项目
```bash
git clone <repository-url>
cd GenerateQrCode
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动服务器
```bash
# 生产模式
npm start

# 开发模式（推荐）
npm run dev
```

### 4. 访问网站
打开浏览器访问：`http://localhost:6789`

## 🔧 项目结构

```
GenerateQrCode/
├── server.js              # 主服务器文件
├── package.json           # 项目配置文件
├── data.json              # 文件信息数据库（自动生成）
├── uploads/               # 上传文件存储目录（自动生成）
├── public/                # 前端静态文件
│   ├── index.html         # 主页面
│   ├── styles.css         # 样式文件
│   └── script.js          # 前端脚本
├── README.md              # 项目说明文档
├── deploy.sh              # 一键部署脚本
└── error-log.md           # 错误日志
```

## 🎯 使用说明

### 上传文件
1. 访问网站主页
2. 拖拽文件到上传区域或点击选择文件
3. 等待文件上传完成

### 生成二维码
1. 文件上传成功后，系统自动生成二维码
2. 二维码包含文件的访问链接

### 保存二维码
1. 点击"保存二维码"按钮
2. 选择保存位置
3. 二维码图片将保存到本地

### 手机扫码查看
1. 使用手机相机或扫码应用扫描二维码
2. 在手机浏览器中查看上传的文件

## 🔗 API 接口

### 文件上传
```http
POST /api/upload
Content-Type: multipart/form-data

参数：
- file: 要上传的文件

响应：
{
  "success": true,
  "fileInfo": {
    "id": "文件ID",
    "originalName": "原始文件名",
    "filename": "存储文件名",
    "mimetype": "文件类型",
    "size": "文件大小",
    "uploadTime": "上传时间"
  },
  "qrCode": "二维码DataURL",
  "accessUrl": "访问链接"
}
```

### 文件访问
```http
GET /file/:id

响应：返回对应的文件内容
```

### 文件信息查询
```http
GET /api/file/:id/info

响应：
{
  "success": true,
  "fileInfo": {
    "id": "文件ID",
    "originalName": "原始文件名",
    "mimetype": "文件类型",
    "size": "文件大小",
    "uploadTime": "上传时间"
  }
}
```

## ⚙️ 配置选项

### 端口配置
默认端口：`6789`
修改 `server.js` 中的 `PORT` 变量来更改端口

### 文件大小限制
默认限制：`100MB`
修改 `server.js` 中的 `limits.fileSize` 配置

### 文件存储路径
默认路径：`./uploads`
修改 `server.js` 中的 `uploadsDir` 变量

## 🚀 部署到服务器

### 1. 使用一键部署脚本
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 执行部署（需要配置服务器信息）
./deploy.sh
```

### 2. 手动部署
```bash
# 1. 上传项目文件到服务器
scp -r ./* user@server:/path/to/project/

# 2. 在服务器上安装依赖
ssh user@server "cd /path/to/project && npm install"

# 3. 启动服务（推荐使用 PM2）
ssh user@server "cd /path/to/project && pm2 start server.js --name qrcode-generator"
```

### 3. 使用 PM2 管理进程
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name qrcode-generator

# 查看状态
pm2 status

# 查看日志
pm2 logs qrcode-generator

# 重启应用
pm2 restart qrcode-generator

# 停止应用
pm2 stop qrcode-generator
```

## 🔒 安全注意事项

1. **文件类型验证**：系统已内置文件类型检查，只允许指定格式文件上传
2. **文件大小限制**：默认限制100MB，防止服务器资源滥用
3. **文件存储隔离**：上传文件存储在独立目录，与系统文件隔离
4. **访问控制**：文件通过唯一ID访问，防止恶意遍历

## 🐛 故障排除

### 常见问题

1. **端口占用**
   ```bash
   Error: listen EADDRINUSE :::6789
   ```
   解决方案：修改 `server.js` 中的端口号或终止占用进程

2. **权限不足**
   ```bash
   Error: EACCES: permission denied
   ```
   解决方案：检查文件夹权限，确保 Node.js 有读写权限

3. **依赖安装失败**
   ```bash
   npm ERR! peer dep missing
   ```
   解决方案：删除 `node_modules` 文件夹后重新运行 `npm install`

4. **文件上传失败**
   - 检查文件格式是否支持
   - 检查文件大小是否超过限制
   - 检查磁盘空间是否充足

### 日志查看
```bash
# 查看服务器日志
tail -f /var/log/qrcode-generator.log

# 查看 PM2 日志
pm2 logs qrcode-generator
```

## 📊 性能优化

### 建议配置
- **内存**：建议 512MB 以上
- **磁盘**：根据文件存储需求配置
- **网络**：建议 1Mbps 以上带宽

### 优化建议
1. 使用 CDN 加速静态资源
2. 配置 gzip 压缩
3. 设置合理的文件缓存策略
4. 定期清理过期文件

## 📄 更新日志

### v1.0.0 (2025-09-13)
- ✨ 初始版本发布
- ✅ 支持多种文件格式上传
- ✅ 自动生成二维码
- ✅ 手机扫码查看功能
- ✅ 二维码本地保存功能
- ✅ 响应式界面设计

## 📞 技术支持

如有问题或建议，请：
1. 查看错误日志文件 `error-log.md`
2. 检查服务器运行状态
3. 查看本文档的故障排除部分

## 📜 开源协议

本项目使用 MIT 协议开源，详见 LICENSE 文件。

---

**享受您的二维码文件生成体验！** 🎉
