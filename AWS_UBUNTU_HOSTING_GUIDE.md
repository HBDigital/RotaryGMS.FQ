# 🚀 AWS Ubuntu Hosting Guide - Rotary GMS 2026

This guide provides step-by-step instructions to host the Rotary GMS 2026 registration application on AWS EC2 with Ubuntu.

## 📋 Prerequisites

### AWS Requirements:
- AWS Account with appropriate permissions
- Domain name: `gms.feequick.com`
- SSL certificate (via AWS Certificate Manager)

### Server Requirements:
- Ubuntu 20.04 LTS or 22.04 LTS
- t3.medium or larger (2GB RAM minimum)
- 20GB SSD storage minimum
- Security Group with HTTP (80), HTTPS (443), and SSH (22) ports

## 🌐 Step 1: Launch AWS EC2 Instance

### 1.1 Create EC2 Instance
1. **Login to AWS Console** → Go to **EC2**
2. Click **Launch Instances**
3. **Name**: `gms-feequick-server`
4. **AMI**: Ubuntu Server 22.04 LTS
5. **Instance Type**: `t3.medium` (2GB RAM, 1 vCPU)
6. **Key Pair**: Create or select existing key pair
7. **Security Group**: Create new security group with rules:
   - **SSH** (22): Your IP address
   - **HTTP** (80): Anywhere (0.0.0.0/0)
   - **HTTPS** (443): Anywhere (0.0.0.0/0)

### 1.2 Configure Storage
- **Root Volume**: 20GB GP3 (SSD)
- Enable **Delete on Termination**: Yes

### 1.3 Launch Instance
1. Review settings
2. Click **Launch Instance**
3. Save your `.pem` key file securely

## 🔧 Step 2: Connect and Setup Server

### 2.1 Connect via SSH
```bash
# Make your key file executable
chmod 400 your-key-file.pem

# Connect to server
ssh -i your-key-file.pem ubuntu@your-server-ip
```

### 2.2 Update System
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common
```

### 2.3 Install Node.js
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 2.5 Install Nginx
```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

## 📁 Step 3: Deploy Application

### 3.1 Clone Repository
```bash
# Create application directory
sudo mkdir -p /var/www/gmsfeequick
sudo chown ubuntu:ubuntu /var/www/gmsfeequick

# Navigate to directory
cd /var/www/gmsfeequick

# Clone your repository (replace with your repo URL)
git clone https://github.com/yourusername/RotaryGMS.FQ.git .

# Or upload files using SCP from local:
# scp -i your-key-file.pem -r /path/to/RotaryGMS.FQ/* ubuntu@your-server-ip:/var/www/gmsfeequick/
```

### 3.2 Install Dependencies
```bash
# Install backend dependencies
npm install --production

# Install frontend dependencies and build
cd client
npm install
npm run build
cd ..
```

### 3.3 Configure Environment
```bash
# Create production environment file
sudo nano .env.production
```

Add the following content:
```env
PORT=5001
RAZORPAY_KEY_ID=your_production_razorpay_key_id
RAZORPAY_KEY_SECRET=your_production_razorpay_secret
FRONTEND_URL=https://gms.feequick.com
NODE_ENV=production
```

### 3.4 Set File Permissions
```bash
# Set proper ownership
sudo chown -R ubuntu:ubuntu /var/www/gmsfeequick

# Set executable permissions
chmod +x server/index.js
```

## 🌐 Step 4: Configure Nginx

### 4.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/gmsfeequick
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name gms.feequick.com www.gmsfeequick.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gms.feequick.com www.gmsfeequick.com;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/gmsfeequick.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gmsfeequick.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Serve React App
    location / {
        root /var/www/gmsfeequick/client/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Node.js
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5001/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.2 Enable Site Configuration
```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Enable new site
sudo ln -s /etc/nginx/sites-available/gmsfeequick /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 Step 5: Setup SSL Certificate

### 5.1 Install Certbot
```bash
# Install Certbot for Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx

# Create SSL certificate
sudo certbot --nginx -d gms.feequick.com -d www.gmsfeequick.com

# Follow prompts to enter email and agree to terms
```

### 5.2 Setup Auto-Renewal
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
```

Add this line:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚀 Step 6: Setup PM2 Process Manager

### 6.1 Create PM2 Configuration File
```bash
nano ecosystem.config.js
```

Add the following content:
```javascript
module.exports = {
  apps: [{
    name: 'gmsfeequick',
    script: 'server/index.js',
    cwd: '/var/www/gmsfeequick',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/var/log/gmsfeequick/error.log',
    out_file: '/var/log/gmsfeequick/out.log',
    log_file: '/var/log/gmsfeequick/combined.log',
    time: true
  }]
};
```

### 6.2 Create Log Directory
```bash
sudo mkdir -p /var/log/gmsfeequick
sudo chown ubuntu:ubuntu /var/log/gmsfeequick
```

### 6.3 Start Application with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output (usually requires sudo)
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### 6.4 Monitor Application
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart application
pm2 restart gmsfeequick
```

## 🔍 Step 7: Configure Domain and DNS

### 7.1 Update DNS Records
In your domain registrar's DNS settings:
```
Type: A
Name: gms
Value: YOUR_SERVER_PUBLIC_IP
TTL: 300

Type: A
Name: www
Value: YOUR_SERVER_PUBLIC_IP
TTL: 300
```

### 7.2 Test Domain Resolution
```bash
# Test DNS resolution
nslookup gms.feequick.com
ping gms.feequick.com
```

## 🧪 Step 8: Test Deployment

### 8.1 Test Application
```bash
# Test API health endpoint
curl https://gms.feequick.com/api/health

# Expected response:
# {"status":"OK","message":"Server is running"}
```

### 8.2 Test Website
1. Open browser: `https://gms.feequick.com`
2. Verify registration form loads
3. Test admin dashboard: `https://gms.feequick.com/admin`
4. Complete a test registration

## 🔧 Step 9: Setup Monitoring and Logging

### 9.1 Configure Log Rotation
```bash
sudo nano /etc/logrotate.d/gmsfeequick
```

Add the following:
```
/var/log/gmsfeequick/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 9.2 Setup Basic Monitoring
```bash
# Install htop for monitoring
sudo apt install -y htop

# Create monitoring script
nano /home/ubuntu/monitor.sh
```

Add the following:
```bash
#!/bin/bash
# Basic monitoring script

echo "=== System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime -p)"
echo "Memory Usage:"
free -h
echo "Disk Usage:"
df -h /
echo "=== PM2 Status ==="
pm2 status
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager
echo "==================="
```

```bash
# Make script executable
chmod +x /home/ubuntu/monitor.sh

# Run monitoring
./monitor.sh
```

## 🔒 Step 10: Security Hardening

### 10.1 Setup Firewall
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Check firewall status
sudo ufw status
```

### 10.2 Disable Root Login
```bash
sudo nano /etc/ssh/sshd_config
```

Set these values:
```
PermitRootLogin no
PasswordAuthentication no
```

```bash
# Restart SSH service
sudo systemctl restart ssh
```

### 10.3 Setup Fail2Ban
```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create configuration
sudo nano /etc/fail2ban/jail.local
```

Add basic configuration:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
```

```bash
# Start fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## 🔄 Step 11: Backup and Maintenance

### 11.1 Create Backup Script
```bash
nano /home/ubuntu/backup.sh
```

Add the following:
```bash
#!/bin/bash
# Backup script for GMS application

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/gmsfeequick"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp $APP_DIR/server/registrations.db $BACKUP_DIR/registrations_$DATE.db

# Backup configuration files
cp $APP_DIR/.env.production $BACKUP_DIR/env_$DATE.backup

# Create application backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR server client/build ecosystem.config.js

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make script executable
chmod +x /home/ubuntu/backup.sh

# Add to cron for daily backup at 2 AM
sudo crontab -e
```

Add this line:
```
0 2 * * * /home/ubuntu/backup.sh >> /var/log/backup.log 2>&1
```

## 📊 Step 12: Performance Optimization

### 12.1 Optimize Nginx
```bash
sudo nano /etc/nginx/nginx.conf
```

Add these optimizations in `http` block:
```nginx
# Worker processes
worker_processes auto;
worker_connections 1024;

# Keep alive timeout
keepalive_timeout 65;

# Client body size
client_max_body_size 10M;

# Buffer sizes
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
```

### 12.2 Enable PM2 Cluster Mode
Update `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'gmsfeequick',
    script: 'server/index.js',
    cwd: '/var/www/gmsfeequick',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/var/log/gmsfeequick/error.log',
    out_file: '/var/log/gmsfeequick/out.log',
    log_file: '/var/log/gmsfeequick/combined.log',
    time: true
  }]
};
```

```bash
# Restart with cluster mode
pm2 restart ecosystem.config.js
pm2 save
```

## 🚨 Troubleshooting

### Common Issues and Solutions:

1. **Application Not Starting**:
   ```bash
   # Check PM2 logs
   pm2 logs gmsfeequick
   
   # Check if port is in use
   sudo netstat -tlnp | grep :5001
   ```

2. **Nginx 502 Bad Gateway**:
   ```bash
   # Check if Node.js app is running
   pm2 status
   
   # Check Nginx error logs
   sudo tail -f /var/log/nginx/error.log
   ```

3. **SSL Certificate Issues**:
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate manually
   sudo certbot renew
   ```

4. **Database Permission Issues**:
   ```bash
   # Check database file permissions
   ls -la /var/www/gmsfeequick/server/registrations.db
   
   # Fix permissions
   sudo chown ubuntu:ubuntu /var/www/gmsfeequick/server/registrations.db
   ```

### Useful Commands:
```bash
# Restart all services
sudo systemctl restart nginx
pm2 restart gmsfeequick

# Check system resources
htop
df -h
free -h

# View real-time logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
pm2 logs gmsfeequick --lines 100
```

## 📈 Monitoring and Scaling

### AWS CloudWatch Setup:
1. Install CloudWatch agent:
   ```bash
   sudo apt install -y amazon-cloudwatch-agent
   ```

2. Configure CloudWatch for monitoring:
   - CPU utilization
   - Memory usage
   - Disk space
   - Network traffic

### Scaling Options:
1. **Vertical Scaling**: Upgrade to larger EC2 instance
2. **Horizontal Scaling**: Use load balancer with multiple instances
3. **Database Scaling**: Move to AWS RDS for better performance

---

**🎉 Your Rotary GMS 2026 application is now hosted on AWS Ubuntu!**

**Application URL**: https://gmsfeequick.com
**Admin Dashboard**: https://gmsfeequick.com/admin

### Quick Reference Commands:
```bash
# SSH to server
ssh -i your-key.pem ubuntu@your-server-ip

# Restart application
pm2 restart gmsfeequick

# View logs
pm2 logs

# Backup data
./backup.sh

# Monitor server
./monitor.sh
```
