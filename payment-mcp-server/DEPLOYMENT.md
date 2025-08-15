# PayFlow MCP Server - Deployment Guide

This guide covers deploying the PayFlow MCP Server to various environments, from local development to production.

## 🏠 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Google Gemini AI API key

### Setup
1. **Clone and install**
   ```bash
   cd payment-mcp-server
   npm install
   ```

2. **Environment configuration**
   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Verify deployment**
   ```bash
   curl http://localhost:3001/health
   ```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist ./dist

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/index.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - mcp-server
    restart: unless-stopped
```

### Build and Run
```bash
# Build image
docker build -t payflow-mcp-server .

# Run container
docker run -d \
  --name mcp-server \
  -p 3001:3001 \
  --env-file .env \
  payflow-mcp-server

# Or use docker-compose
docker-compose up -d
```

## ☁️ Cloud Deployment

### AWS EC2 Deployment

#### 1. Launch EC2 Instance
```bash
# Launch Ubuntu 22.04 LTS instance
# Instance type: t3.medium or larger
# Security group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

#### 2. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install nginx
sudo apt install nginx -y

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### 3. Deploy Application
```bash
# Clone repository
git clone <your-repo-url>
cd payment-mcp-server

# Install dependencies
npm install

# Build application
npm run build

# Create ecosystem file for PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'payflow-mcp-server',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_file: '.env',
    log_file: './logs/combined.log',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 4. Configure Nginx
```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/payflow-mcp

# Add configuration
server {
    listen 80;
    server_name api.hindcab.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/payflow-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d api.hindcab.com
```

### Google Cloud Platform (GCP)

#### 1. Create Compute Engine Instance
```bash
# Create instance
gcloud compute instances create mcp-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server

# Create firewall rules
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --target-tags=http-server \
  --description="Allow HTTP traffic"

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --target-tags=https-server \
  --description="Allow HTTPS traffic"
```

#### 2. Deploy Application
```bash
# SSH to instance
gcloud compute ssh mcp-server --zone=us-central1-a

# Follow same deployment steps as AWS EC2
```

### Azure App Service

#### 1. Create App Service
```bash
# Create resource group
az group create --name payflow-mcp-rg --location eastus

# Create app service plan
az appservice plan create \
  --name payflow-mcp-plan \
  --resource-group payflow-mcp-rg \
  --sku B1 \
  --is-linux

# Create web app
az webapp create \
  --name payflow-mcp-server \
  --resource-group payflow-mcp-rg \
  --plan payflow-mcp-plan \
  --runtime "NODE|18-lts"
```

#### 2. Deploy Application
```bash
# Deploy from local directory
az webapp deployment source config-local-git \
  --name payflow-mcp-server \
  --resource-group payflow-mcp-rg

# Get deployment URL
az webapp deployment list-publishing-credentials \
  --name payflow-mcp-server \
  --resource-group payflow-mcp-rg

# Deploy
git remote add azure <deployment-url>
git push azure main
```

## 🚀 Production Considerations

### Environment Variables
```bash
# Production environment
NODE_ENV=production
PORT=3001

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
GEMINI_API_KEY=your-gemini-api-key

# Security
JWT_SECRET=your-super-secure-jwt-secret
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=error
LOG_FILE_PATH=./logs/mcp-server.log

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Security Hardening
```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure fail2ban for nginx
sudo nano /etc/fail2ban/jail.local

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

# Restart fail2ban
sudo systemctl restart fail2ban
```

### Monitoring and Logging
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Setup log rotation
sudo nano /etc/logrotate.d/payflow-mcp

/path/to/payment-mcp-server/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Backup Strategy
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/mcp-server"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /path/to/payment-mcp-server

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /path/to/payment-mcp-server/logs

# Backup environment
cp /path/to/payment-mcp-server/.env $BACKUP_DIR/env_$DATE

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "env_*" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

# Make executable and add to cron
chmod +x backup.sh
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## 🔧 Performance Tuning

### Node.js Optimization
```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use PM2 cluster mode
pm2 start ecosystem.config.js --instances max

# Monitor performance
pm2 monit
```

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_payments_status_date ON payments(status, date);
CREATE INDEX idx_payments_vendor ON payments(vendor_name);
CREATE INDEX idx_payments_amount ON payments(payment_amount);
CREATE INDEX idx_payments_urgency ON payments(urgency_level);

-- Analyze table statistics
ANALYZE payments;
ANALYZE vendors;
ANALYZE users;
```

### Nginx Optimization
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=mcp:10m rate=10r/s;
location / {
    limit_req zone=mcp burst=20 nodelay;
    proxy_pass http://localhost:3001;
}
```

## 🚨 Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory usage
pm2 monit
htop

# Restart if needed
pm2 restart payflow-mcp-server
```

#### Database Connection Issues
```bash
# Check database status
curl http://localhost:3001/health

# Check logs
tail -f logs/error.log
```

#### SSL Certificate Issues
```bash
# Renew SSL certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### Health Checks
```bash
# Application health
curl http://localhost:3001/health

# Database connection
curl http://localhost:3001/admin/status

# System resources
df -h
free -h
top
```

## 📊 Monitoring Setup

### Prometheus + Grafana
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mcp-server'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

### Application Metrics
```typescript
// Add metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP mcp_requests_total Total number of requests
# TYPE mcp_requests_total counter
mcp_requests_total{method="POST",endpoint="/query"} ${queryCount}
mcp_requests_total{method="POST",endpoint="/chat"} ${chatCount}
  `);
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
name: Deploy MCP Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /path/to/payment-mcp-server
            git pull origin main
            npm ci --only=production
            npm run build
            pm2 restart payflow-mcp-server
```

This deployment guide provides comprehensive coverage for deploying the PayFlow MCP Server across different environments and platforms.
