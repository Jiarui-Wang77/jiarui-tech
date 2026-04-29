# 🚀 JIARUI TECH — 香港服务器部署手册

## 今晚准备

### 1. 把代码推到 GitHub
```bash
# 在项目根目录执行
git init
git add .
git commit -m "initial production deployment"
git remote add origin https://github.com/你的用户名/jiarui-tech.git
git push -u origin main
```

### 2. 修改 .env.production 里的配置
打开 `backend/.env.production`，填写：
- `YOUR_STRONG_DB_PASSWORD` → 改成强密码（例：Jt@2024!Prod#8k）
- `YOUR_STRONG_SECRET_KEY`  → 改成随机64位字符串
- `YOUR_DOMAIN.com`         → 你的真实域名
- `YOUR_GITHUB_TOKEN`       → 粘贴开发环境的值
- `YOUR_DEEPSEEK_API_KEY`   → 粘贴开发环境的值
- `YOUR_CLAUDE_API_KEY`     → 粘贴开发环境的值

---

## 明天操作（买完服务器后）

### 第一步：SSH 登录服务器
```bash
ssh root@服务器IP
```

### 第二步：一键初始化环境
```bash
curl -fsSL https://raw.githubusercontent.com/你的用户名/jiarui-tech/main/deploy/setup.sh | bash
```
等待安装完成（约 3-5 分钟），然后**重新登录 SSH**。

### 第三步：克隆代码
```bash
git clone https://github.com/你的用户名/jiarui-tech.git
cd jiarui-tech
```

### 第四步：填写生产环境变量
```bash
# 把开发环境的值复制进来
nano backend/.env.production
```
把所有 `YOUR_*` 占位符替换成真实值。

### 第五步：启动所有服务
```bash
# DB_PASSWORD 要和 .env.production 里的 DB_PASSWORD 一致
DB_PASSWORD=你设置的DB密码 docker compose -f docker-compose.prod.yml up -d --build
```
首次构建约需 **5-10 分钟**（下载镜像 + 编译前端）。

### 第六步：初始化数据库
```bash
# 运行数据库迁移
docker exec jiarui_backend alembic upgrade head

# （可选）导入种子数据
docker exec jiarui_backend python seed.py
```

### 第七步：验证服务正常
```bash
# 检查所有容器都是 Up 状态
docker compose -f docker-compose.prod.yml ps

# 测试后端接口
curl http://localhost:8000/api/health

# 测试前端
curl http://localhost:3000
```

### 第八步：配置 Nginx
```bash
# 复制 Nginx 配置
sudo cp deploy/nginx.conf /etc/nginx/sites-available/jiaruitech

# 修改配置里的域名
sudo nano /etc/nginx/sites-available/jiaruitech
# 把所有 YOUR_DOMAIN.com 改成你的真实域名

# 启用站点
sudo ln -s /etc/nginx/sites-available/jiaruitech /etc/nginx/sites-enabled/
sudo nginx -t  # 检查配置
sudo systemctl reload nginx
```

### 第九步：域名解析
在域名控制台（阿里云）添加 DNS 记录：
```
A  @    →  服务器IP
A  www  →  服务器IP
```
等待 DNS 生效（通常 5-30 分钟）。

### 第十步：申请 SSL 证书
```bash
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
```
按提示输入邮箱，选择自动重定向 HTTP→HTTPS。

---

## ✅ 上线完成！

访问 `https://你的域名.com` 即可看到网站。

---

## 常用运维命令

```bash
# 查看日志
docker logs jiarui_frontend -f
docker logs jiarui_backend -f

# 重启服务
docker compose -f docker-compose.prod.yml restart

# 更新代码重新部署
git pull
docker compose -f docker-compose.prod.yml up -d --build frontend

# 停止所有服务
docker compose -f docker-compose.prod.yml down
```
