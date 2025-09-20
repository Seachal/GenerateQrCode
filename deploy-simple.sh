#!/bin/bash

# 简化版部署脚本 - 解决 rsync 问题
# 使用 scp 直接上传文件

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置变量
SERVER_IP="209.146.116.156"
SERVER_USER="root"
SERVER_PORT="22"
DEPLOY_PATH="/var/www/qrcode-generator"
SERVICE_NAME="qrcode-generator"
SERVICE_PORT="6789"

echo "=================================================================="
echo "🚀 二维码文件生成器 - 简化部署脚本"
echo "=================================================================="
echo "解决 rsync 问题，使用 scp 直接上传"
echo ""

print_info "部署配置："
echo "  服务器: $SERVER_USER@$SERVER_IP:$SERVER_PORT"
echo "  路径: $DEPLOY_PATH"
echo "  端口: $SERVICE_PORT"
echo ""

read -p "确认要继续部署吗？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "部署已取消"
    exit 0
fi

# 1. 测试连接
print_info "测试服务器连接..."
if ssh -o ConnectTimeout=10 -p $SERVER_PORT $SERVER_USER@$SERVER_IP "echo '连接成功'" &> /dev/null; then
    print_success "服务器连接正常"
else
    print_error "无法连接到服务器"
    exit 1
fi

# 2. 准备服务器环境
print_info "准备服务器环境..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
    # 更新包管理器
    apt-get update -qq
    
    # 安装必要工具
    apt-get install -y curl
    
    # 检查并安装 Node.js
    if ! command -v node &> /dev/null; then
        echo '安装 Node.js...'
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    # 检查并安装 PM2
    if ! command -v pm2 &> /dev/null; then
        echo '安装 PM2...'
        npm install -g pm2
    fi
    
    # 创建目录
    mkdir -p '$DEPLOY_PATH'
    mkdir -p /var/log/qrcode-generator
    
    echo '服务器环境准备完成'
"
print_success "服务器环境准备完成"

# 3. 打包并上传项目文件
print_info "打包并上传项目文件..."

# 创建临时目录
TEMP_DIR="/tmp/qrcode-deploy-$(date +%s)"
mkdir -p $TEMP_DIR

# 复制需要的文件
cp server.js $TEMP_DIR/
cp package.json $TEMP_DIR/
cp -r public $TEMP_DIR/
cp project-log.md $TEMP_DIR/ 2>/dev/null || true

# 清理服务器目录并上传
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "rm -rf $DEPLOY_PATH/*"
scp -P $SERVER_PORT -r $TEMP_DIR/* $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/

# 清理临时目录
rm -rf $TEMP_DIR

print_success "项目文件上传完成"

# 4. 安装依赖
print_info "安装项目依赖..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
    cd '$DEPLOY_PATH'
    npm install --production
"
print_success "依赖安装完成"

# 5. 创建PM2配置
print_info "配置PM2服务..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
    cd '$DEPLOY_PATH'
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'server.js',
    cwd: '$DEPLOY_PATH',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: '$SERVICE_PORT'
    },
    log_file: '/var/log/qrcode-generator/combined.log',
    out_file: '/var/log/qrcode-generator/out.log',
    error_file: '/var/log/qrcode-generator/error.log'
  }]
};
EOF
"
print_success "PM2配置完成"

# 6. 部署后清理和初始化
print_info "清理临时文件和初始化..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
    cd '$DEPLOY_PATH'
    
    # 创建必要的目录
    mkdir -p uploads/temp
    mkdir -p uploads/students
    
    # 清理可能的临时文件
    find uploads/temp -type f -mtime +1 -delete 2>/dev/null || true
    
    # 设置正确的权限
    chmod -R 755 uploads/
"

# 7. 启动服务
print_info "启动服务..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
    cd '$DEPLOY_PATH'
    
    # 停止现有进程
    pm2 stop '$SERVICE_NAME' 2>/dev/null || true
    pm2 delete '$SERVICE_NAME' 2>/dev/null || true
    
    # 启动新进程
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup | grep -o 'sudo.*' | bash || true
"
print_success "服务启动完成"

# 8. 验证部署
print_info "验证部署..."
sleep 5

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
    echo '=== PM2 状态 ==='
    pm2 status
    
    echo ''
    echo '=== 端口监听 ==='
    netstat -tlnp | grep :$SERVICE_PORT || echo '端口未监听'
"

# 测试服务
if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP:$SERVICE_PORT | grep -q "200"; then
    print_success "服务响应正常"
else
    print_warning "服务可能尚未完全启动"
fi

echo ""
echo "=================================================================="
print_success "🎉 部署完成！"
echo "=================================================================="
echo ""
echo "📊 部署信息："
echo "  🌐 服务器: $SERVER_IP"
echo "  📁 路径: $DEPLOY_PATH" 
echo "  🔌 端口: $SERVICE_PORT"
echo ""
echo "🔗 访问地址: http://$SERVER_IP:$SERVICE_PORT"
echo ""
echo "🛠️ 管理命令："
echo "  pm2 status"
echo "  pm2 logs $SERVICE_NAME"
echo "  pm2 restart $SERVICE_NAME"
echo ""
print_info "部署成功完成！🎉"
