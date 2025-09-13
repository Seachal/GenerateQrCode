# 错误日志 | Error Log

本文档记录了二维码文件生成器项目开发和部署过程中遇到的错误及解决方案。

## 📅 2025-09-13 - 项目初始化

### ✅ 已解决的问题

#### 1. Multer 安全警告
**错误描述：**
```
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities
```

**解决方案：**
- 升级到 multer@2.0.0-alpha.0 版本
- 更新 package.json 配置
- 重新安装依赖包

**修复时间：** 2025-09-13 08:15

---

#### 2. 端口配置优化
**问题描述：**
- 原始配置使用常见端口可能导致冲突

**解决方案：**
- 改用随机端口 6789 避免冲突
- 在文档中说明端口配置方法

**修复时间：** 2025-09-13 08:20

---

### 🔧 预防措施

#### 1. 依赖管理
- 定期检查依赖包的安全更新
- 使用 `npm audit` 检查安全漏洞
- 及时升级有安全问题的包

#### 2. 端口管理
- 避免使用常见端口（8080, 5000, 6000等）
- 在配置文件中使用可配置的端口
- 提供端口冲突的解决方案

---

#### 3. 部署脚本 rsync 错误
**错误描述：**
```
bash: line 1: rsync: command not found
rsync: connection unexpectedly closed (0 bytes received so far) [sender]
rsync error: error in rsync protocol data stream (code 12)
```

**原因分析：**
- 服务器上未安装 rsync 工具
- 部署脚本依赖 rsync 进行文件同步

**解决方案：**
1. **方案一：安装 rsync**
   ```bash
   # 在部署脚本中添加 rsync 安装
   apt-get update
   apt-get install -y rsync
   ```

2. **方案二：使用简化部署脚本**
   ```bash
   # 使用 scp 替代 rsync
   ./deploy-simple.sh
   ```

**修复时间：** 2025-09-13 17:10
**状态：** ✅ 已修复，提供两种解决方案

---

## 🚀 部署相关记录

### 服务器环境
- **操作系统：** Linux Debian 5.10.0-27-amd64
- **服务器IP：** 209.146.116.156
- **用户：** root
- **部署路径：** /var/www/qrcode-generator

### 部署注意事项
1. 服务器上已有其他网站，避免覆盖
2. 使用独立的部署路径
3. 配置 PM2 进程管理
4. 设置 Nginx 反向代理（可选）

---

## 🐛 常见问题与解决方案

### 1. 文件上传失败
**可能原因：**
- 文件格式不支持
- 文件大小超过限制
- 磁盘空间不足
- 权限问题

**解决方案：**
```javascript
// 检查文件类型和大小
const allowedTypes = [...];
if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('不支持的文件格式');
}

if (file.size > 100 * 1024 * 1024) {
    throw new Error('文件大小超过限制');
}
```

### 2. 二维码生成失败
**可能原因：**
- QRCode 库异常
- 网络连接问题
- 内存不足

**解决方案：**
```javascript
try {
    const qrCodeDataURL = await QRCode.toDataURL(fileUrl, {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    });
} catch (error) {
    console.error('二维码生成失败:', error);
    // 降级处理或重试
}
```

### 3. 服务器启动失败
**可能原因：**
- 端口被占用
- 权限不足
- 依赖缺失

**解决方案：**
```bash
# 检查端口占用
netstat -tlnp | grep :6789

# 终止占用进程
kill -9 <PID>

# 或者更换端口
```

### 4. 文件访问404错误
**可能原因：**
- 文件路径错误
- 文件被删除
- 权限问题

**解决方案：**
```javascript
// 检查文件是否存在
if (!await fs.pathExists(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
}
```

---

## 🔍 调试技巧

### 1. 启用详细日志
```javascript
// 在开发环境启用详细日志
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}
```

### 2. 错误捕获
```javascript
// 全局错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});
```

### 3. 监控工具
- 使用 PM2 查看进程状态
- 配置日志轮转
- 设置内存和CPU监控

---

## 📈 性能优化记录

### 1. 文件上传优化
- 使用流式处理大文件
- 实现文件上传进度显示
- 添加文件类型预检查

### 2. 二维码缓存
- 对相同链接的二维码进行缓存
- 设置合理的缓存过期时间
- 减少重复生成开销

### 3. 静态资源优化
- 启用 gzip 压缩
- 设置浏览器缓存
- 使用 CDN 加速

---

## 📋 待优化项目

### 短期计划
- [ ] 添加文件批量上传功能
- [ ] 实现二维码样式自定义
- [ ] 添加文件预览功能
- [ ] 支持文件夹压缩下载

### 长期计划
- [ ] 用户账户系统
- [ ] 文件分享管理
- [ ] 访问统计分析
- [ ] 多语言支持

---

## 💡 最佳实践

### 1. 代码质量
- 使用 ESLint 检查代码质量
- 编写单元测试
- 定期重构优化

### 2. 安全性
- 定期更新依赖包
- 实现输入验证
- 使用 HTTPS 传输

### 3. 可维护性
- 详细的代码注释
- 完整的文档说明
- 版本控制管理

---

## 📞 问题反馈

如果遇到本文档未涵盖的问题，请：

1. 检查服务器日志
2. 确认环境配置
3. 查看官方文档
4. 搜索相关资料

**最后更新时间：** 2025-09-13 08:30  
**更新人员：** Seachal  
**版本：** v1.0.0
