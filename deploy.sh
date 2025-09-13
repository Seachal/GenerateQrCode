#!/bin/bash

# 二维码文件生成器一键部署脚本
# 作者：Seachal
# 日期：2025-09-13

set -e  # 遇到错误立即退出

# 颜色输出函数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示脚本标题
echo "=================================================================="
echo "🚀 二维码文件生成器 - 一键部署脚本"
echo "=================================================================="
echo ""

# 配置变量（请根据实际情况修改）
SERVER_IP="209.146.116.156"
SERVER_USER="root"
SERVER_PORT="22"
DEPLOY_PATH="/var/www/qrcode-generator"
SERVICE_NAME="qrcode-generator"
SERVICE_PORT="6789"

# 检查必要的命令
check_commands() {
    print_info "检查必要的命令..."
    
    commands=("scp" "ssh" "rsync")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            print_error "命令 '$cmd' 未找到，请先安装"
            exit 1
        fi
    done
    
    print_success "所有必要命令已安装"
}

# 检查本地文件
check_local_files() {
    print_info "检查本地项目文件..."
    
    required_files=("server.js" "package.json" "public/index.html" "public/styles.css" "public/script.js")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "文件 '$file' 不存在"
            exit 1
        fi
    done
    
    print_success "所有项目文件检查完成"
}

# 连接测试
test_connection() {
    print_info "测试服务器连接..."
    
    if ssh -o ConnectTimeout=10 -p $SERVER_PORT $SERVER_USER@$SERVER_IP "echo '连接成功'" &> /dev/null; then
        print_success "服务器连接正常"
    else
        print_error "无法连接到服务器 $SERVER_USER@$SERVER_IP:$SERVER_PORT"
        print_info "请检查："
        echo "  - 服务器IP地址是否正确"
        echo "  - SSH端口是否正确"
        echo "  - SSH密钥是否已配置"
        echo "  - 服务器是否在线"
        exit 1
    fi
}

# 备份现有部署
backup_existing() {
    print_info "备份现有部署..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        if [ -d '$DEPLOY_PATH' ]; then
            backup_name='${DEPLOY_PATH}_backup_$(date +%Y%m%d_%H%M%S)'
            echo '创建备份：$backup_name'
            cp -r '$DEPLOY_PATH' '$backup_name'
            echo '备份完成'
        else
            echo '没有现有部署需要备份'
        fi
    "
}

# 准备服务器环境
prepare_server() {
    print_info "准备服务器环境..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        # 更新包管理器
        apt-get update
        
        # 检查并安装 rsync
        if ! command -v rsync &> /dev/null; then
            echo '安装 rsync...'
            apt-get install -y rsync
        else
            echo 'rsync 已安装'
        fi
        
        # 检查并安装 Node.js
        if ! command -v node &> /dev/null; then
            echo '安装 Node.js...'
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            apt-get install -y nodejs
        else
            echo 'Node.js 已安装: \$(node --version)'
        fi
        
        # 检查并安装 PM2
        if ! command -v pm2 &> /dev/null; then
            echo '安装 PM2...'
            npm install -g pm2
        else
            echo 'PM2 已安装: \$(pm2 --version)'
        fi
        
        # 创建部署目录
        mkdir -p '$DEPLOY_PATH'
        
        # 创建日志目录
        mkdir -p /var/log/qrcode-generator
        
        echo '服务器环境准备完成'
    "
    
    print_success "服务器环境准备完成"
}

# 上传项目文件
upload_files() {
    print_info "上传项目文件到服务器..."
    
    # 创建临时排除列表
    cat > .rsync_exclude <<EOF
node_modules/
uploads/
data.json
*.log
.git/
.gitignore
deploy.sh
error-log.md
EOF
    
    # 尝试使用 rsync 同步文件
    if rsync -avz --progress --delete \
        --exclude-from=.rsync_exclude \
        -e "ssh -p $SERVER_PORT" \
        ./ $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/ 2>/dev/null; then
        print_success "使用 rsync 上传文件完成"
    else
        print_warning "rsync 失败，使用 scp 备用方案..."
        
        # 备用方案：使用 scp 上传
        # 清理目标目录
        ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "rm -rf $DEPLOY_PATH/*"
        
        # 创建临时目录并复制需要的文件
        mkdir -p /tmp/qrcode-deploy
        cp -r server.js package.json public /tmp/qrcode-deploy/
        
        # 上传文件
        scp -P $SERVER_PORT -r /tmp/qrcode-deploy/* $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
        
        # 清理临时目录
        rm -rf /tmp/qrcode-deploy
        
        print_success "使用 scp 上传文件完成"
    fi
    
    # 删除临时文件
    rm -f .rsync_exclude
}

# 安装依赖
install_dependencies() {
    print_info "安装项目依赖..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        cd '$DEPLOY_PATH'
        echo '安装 npm 依赖...'
        npm install --production
        echo '依赖安装完成'
    "
    
    print_success "依赖安装完成"
}

# 配置服务
configure_service() {
    print_info "配置系统服务..."
    
    # 创建 PM2 生态系统文件
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
    error_file: '/var/log/qrcode-generator/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
    "
    
    print_success "服务配置完成"
}

# 配置 Nginx（可选）
configure_nginx() {
    print_info "配置 Nginx 反向代理..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        # 检查 Nginx 是否已安装
        if command -v nginx &> /dev/null; then
            # 创建 Nginx 配置
            cat > /etc/nginx/sites-available/qrcode-generator <<EOF
server {
    listen 80;
    server_name \$server_name;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:$SERVICE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }
    
    location /uploads/ {
        alias $DEPLOY_PATH/uploads/;
        expires 30d;
        add_header Cache-Control \"public, immutable\";
    }
}
EOF
            
            # 启用站点
            ln -sf /etc/nginx/sites-available/qrcode-generator /etc/nginx/sites-enabled/
            
            # 测试配置
            nginx -t && systemctl reload nginx
            
            echo 'Nginx 配置完成'
        else
            echo 'Nginx 未安装，跳过 Nginx 配置'
        fi
    "
}

# 启动服务
start_service() {
    print_info "启动服务..."
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        cd '$DEPLOY_PATH'
        
        # 停止现有进程
        pm2 stop '$SERVICE_NAME' 2>/dev/null || true
        pm2 delete '$SERVICE_NAME' 2>/dev/null || true
        
        # 启动新进程
        pm2 start ecosystem.config.js
        
        # 保存 PM2 配置
        pm2 save
        
        # 设置开机启动
        pm2 startup | grep -o 'sudo.*' | bash || true
        
        echo '服务启动完成'
    "
    
    print_success "服务启动成功"
}

# 验证部署
verify_deployment() {
    print_info "验证部署..."
    
    # 等待服务启动
    sleep 5
    
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP "
        # 检查服务状态
        echo '=== PM2 状态 ==='
        pm2 status
        
        echo ''
        echo '=== 端口监听状态 ==='
        netstat -tlnp | grep :$SERVICE_PORT || echo '端口 $SERVICE_PORT 未监听'
        
        echo ''
        echo '=== 最近日志 ==='
        pm2 logs '$SERVICE_NAME' --lines 10 --nostream
    "
    
    # 测试服务响应
    print_info "测试服务响应..."
    if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP:$SERVICE_PORT | grep -q "200"; then
        print_success "服务响应正常"
    else
        print_warning "服务可能尚未完全启动，请稍后检查"
    fi
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "=================================================================="
    print_success "🎉 部署完成！"
    echo "=================================================================="
    echo ""
    echo "📊 部署信息："
    echo "  🌐 服务器地址: $SERVER_IP"
    echo "  📁 部署路径: $DEPLOY_PATH"
    echo "  🔌 服务端口: $SERVICE_PORT"
    echo "  🏷️  服务名称: $SERVICE_NAME"
    echo ""
    echo "🔗 访问地址："
    echo "  📱 直接访问: http://$SERVER_IP:$SERVICE_PORT"
    if command -v nginx &> /dev/null; then
        echo "  🌍 Nginx代理: http://$SERVER_IP"
    fi
    echo ""
    echo "🛠️ 管理命令："
    echo "  查看状态: ssh $SERVER_USER@$SERVER_IP 'pm2 status'"
    echo "  查看日志: ssh $SERVER_USER@$SERVER_IP 'pm2 logs $SERVICE_NAME'"
    echo "  重启服务: ssh $SERVER_USER@$SERVER_IP 'pm2 restart $SERVICE_NAME'"
    echo "  停止服务: ssh $SERVER_USER@$SERVER_IP 'pm2 stop $SERVICE_NAME'"
    echo ""
    echo "📄 日志文件："
    echo "  /var/log/qrcode-generator/combined.log"
    echo "  /var/log/qrcode-generator/out.log"
    echo "  /var/log/qrcode-generator/error.log"
    echo ""
    print_info "享受您的二维码文件生成器！🎉"
}

# 错误处理
handle_error() {
    print_error "部署过程中发生错误！"
    echo ""
    echo "🔧 故障排除建议："
    echo "  1. 检查服务器连接"
    echo "  2. 检查用户权限"
    echo "  3. 检查磁盘空间"
    echo "  4. 查看错误日志"
    echo ""
    echo "📞 如需帮助，请查看 README.md 中的故障排除部分"
    exit 1
}

# 主执行流程
main() {
    # 设置错误处理
    trap handle_error ERR
    
    print_info "开始部署流程..."
    echo ""
    
    # 显示配置信息
    echo "📋 部署配置："
    echo "  服务器: $SERVER_USER@$SERVER_IP:$SERVER_PORT"
    echo "  路径: $DEPLOY_PATH"
    echo "  端口: $SERVICE_PORT"
    echo ""
    
    # 确认部署
    read -p "确认要继续部署吗？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "部署已取消"
        exit 0
    fi
    
    # 执行部署步骤
    check_commands
    check_local_files
    test_connection
    backup_existing
    prepare_server
    upload_files
    install_dependencies
    configure_service
    configure_nginx
    start_service
    verify_deployment
    show_deployment_info
}

# 如果作为脚本直接执行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
