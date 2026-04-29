#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  JIARUI TECH — 服务器一键初始化脚本
#  适用于 Ubuntu 22.04
#  用法: bash setup.sh
# ═══════════════════════════════════════════════════════════

set -e
echo "🚀 开始初始化服务器..."

# ── 1. 更新系统 ────────────────────────────────────────────
sudo apt-get update && sudo apt-get upgrade -y

# ── 2. 安装 Docker ─────────────────────────────────────────
echo "📦 安装 Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# ── 3. 安装 Docker Compose Plugin ──────────────────────────
sudo apt-get install -y docker-compose-plugin

# ── 4. 安装 Nginx ──────────────────────────────────────────
echo "🌐 安装 Nginx..."
sudo apt-get install -y nginx

# ── 5. 安装 Certbot (SSL) ──────────────────────────────────
echo "🔒 安装 Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# ── 6. 安装 Git ────────────────────────────────────────────
sudo apt-get install -y git

# ── 7. 防火墙配置 ──────────────────────────────────────────
echo "🔥 配置防火墙..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo ""
echo "✅ 服务器初始化完成！"
echo "⚠️  请重新登录 SSH，使 Docker 权限生效"
echo ""
echo "下一步:"
echo "  1. 重新登录: exit → ssh root@服务器IP"
echo "  2. 克隆代码: git clone https://github.com/你的仓库"
echo "  3. 配置环境变量"
echo "  4. 运行: docker compose -f docker-compose.prod.yml up -d --build"
