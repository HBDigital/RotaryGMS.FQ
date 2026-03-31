#!/bin/bash
# Run this on the server: bash update-server.sh

set -e

APP_DIR="/var/www/gmsfeequick"
cd $APP_DIR

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing backend dependencies..."
npm install --production

echo "🏗️  Building React frontend..."
cd client
npm install
npm run build
cd ..

echo "♻️  Restarting app with PM2..."
pm2 restart gmsfeequick

echo "✅ Update complete!"
pm2 status
