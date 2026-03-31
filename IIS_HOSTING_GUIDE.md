# 🚀 IIS Hosting Guide - Rotary GMS 2026

This guide provides step-by-step instructions to host the Rotary GMS 2026 registration application on Windows Server using IIS.

## 📋 Prerequisites

### Server Requirements:
- Windows Server 2016 or later
- IIS (Internet Information Services) 10.0 or later
- Node.js 18.x or later (LTS version recommended)
- URL Rewrite Module for IIS
- iisnode (for running Node.js applications in IIS)

### Domain Requirements:
- Domain name: `gms.feequick.com`
- SSL certificate (for HTTPS)
- DNS A record pointing to server IP

## 🔧 Step 1: Install Required Components

### 1.1 Install IIS
```powershell
# Run as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging
Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ASPNET45
```

### 1.2 Install URL Rewrite Module
Download and install from: https://www.iis.net/downloads/microsoft/url-rewrite

### 1.3 Install Node.js
Download and install LTS version from: https://nodejs.org/

### 1.4 Install iisnode
Download and install from: https://github.com/azure/iisnode/releases

## 📁 Step 2: Prepare Application Files

### 2.1 Build the Application
```bash
# On your development machine
cd /Users/vivek/CascadeProjects/RotaryGMS.FQ

# Install dependencies
npm run install-all

# Build React app for production
cd client
npm run build
cd ..

# The build folder is now ready at client/build/
```

### 2.2 Create Production Package
Create a folder structure on the server:
```
C:\inetpub\gmsfeequick\
├── server\
│   ├── index.js
│   ├── routes\
│   ├── utils\
│   ├── database\
│   └── package.json
├── client\
│   └── build\
│       ├── static\
│       ├── index.html
│       └── ... (other build files)
├── web.config
├── package.json
└── .env.production
```

### 2.3 Copy Files to Server
Copy the following files to `C:\inetpub\gmsfeequick\`:

**Server Files:**
- All files from `server/` directory
- Root `package.json`
- `.env.production` (rename from `.env`)

**Client Files:**
- Entire `client/build/` directory

## ⚙️ Step 3: Configure Environment

### 3.1 Create Production .env File
Create `C:\inetpub\gmsfeequick\.env.production`:
```env
PORT=5001
RAZORPAY_KEY_ID=your_production_razorpay_key_id
RAZORPAY_KEY_SECRET=your_production_razorpay_secret
FRONTEND_URL=https://gms.feequick.com
NODE_ENV=production
```

### 3.2 Install Dependencies on Server
```powershell
cd C:\inetpub\gmsfeequick
npm install --production
cd server
npm install --production
```

## 🌐 Step 4: Configure IIS

### 4.1 Create New Website
1. Open **IIS Manager**
2. Right-click **Sites** → **Add Website**
3. **Site name**: `GMSFeeQuick`
4. **Physical path**: `C:\inetpub\gmsfeequick`
5. **Port**: `80` (temporarily for setup)
6. **Host name**: `gms.feequick.com`
7. Click **OK**

### 4.2 Create web.config File
Create `C:\inetpub\gmsfeequick\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- URL Rewrite for React Router -->
    <rewrite>
      <rules>
        <!-- API routes to Node.js -->
        <rule name="Node.js API" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="server/index.js/{R:1}" />
        </rule>
        
        <!-- All other routes to React app -->
        <rule name="React App" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/client/build/index.html" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- iisnode configuration -->
    <handlers>
      <add name="iisnode" path="server/index.js" verb="*" modules="iisnode" />
    </handlers>
    
    <!-- iisnode settings -->
    <iisnode 
      watchedFiles="*.js;*.json"
      node_env="production"
      nodeProcessCountPerApplication="1"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="3"
      namedPipeConnectionRetryDelay="2000"
      maxNamedPipeConnectionPoolSize="512"
      maxNamedPipePooledConnectionAge="30000"
      asyncCompletionThreadCount="0"
      initialRequestBufferSize="4096"
      maxRequestBufferSize="65536"
      uncFileChangesPollingInterval="5000"
      gracefulShutdownTimeout="60000"
      loggingEnabled="true"
      logDirectory="logs"
      debuggingEnabled="false"
      devErrorsEnabled="false"
    />
    
    <!-- Static file handling -->
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    
    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### 4.3 Create Node.js web.config
Create `C:\inetpub\gmsfeequick\server\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="index.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="Node.js" stopProcessing="true">
          <match url="^(.*)" />
          <action type="Rewrite" url="index.js/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <iisnode node_env="production" />
  </system.webServer>
</configuration>
```

## 🔒 Step 5: Configure SSL Certificate

### 5.1 Install SSL Certificate
1. In IIS Manager, select the server
2. Double-click **Server Certificates**
3. Click **Import...**
4. Select your SSL certificate file (.pfx)
5. Enter password and click **OK**

### 5.2 Bind SSL to Website
1. Select your website `GMSFeeQuick`
2. Click **Bindings...** in the Actions pane
3. Click **Add...**
4. **Type**: `https`
5. **Port**: `443`
6. **Host name**: `gms.feequick.com`
7. **SSL certificate**: Select your certificate
8. Click **OK**

### 5.3 Redirect HTTP to HTTPS
Add this rule to `web.config`:

```xml
<rule name="HTTP to HTTPS Redirect" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

## 🔧 Step 6: Configure Database

### 6.1 Database Location
The SQLite database will be created at:
```
C:\inetpub\gmsfeequick\server\registrations.db
```

### 6.2 Set Permissions
```powershell
# Give IIS permission to write database
icacls "C:\inetpub\gmsfeequick\server" /grant "IIS_IUSRS:(OI)(CI)F"
icacls "C:\inetpub\gmsfeequick\server\registrations.db" /grant "IIS_IUSRS:(F)"
```

## 🚀 Step 7: Test and Deploy

### 7.1 Start the Website
1. In IIS Manager, select `GMSFeeQuick`
2. Click **Start** in the Actions pane
3. Browse to `https://gms.feequick.com`

### 7.2 Test API Endpoints
```bash
# Test health endpoint
curl https://gms.feequick.com/api/health

# Expected response:
# {"status":"OK","message":"Server is running"}
```

### 7.3 Test Registration
1. Open `https://gms.feequick.com` in browser
2. Fill out registration form
3. Complete payment process
4. Verify everything works correctly

## 🔍 Step 8: Monitoring and Logs

### 8.1 IIS Logs
Location: `C:\inetpub\logs\LogFiles\W3SVC1\`

### 8.2 iisnode Logs
Location: `C:\inetpub\gmsfeequick\logs\`

### 8.3 Application Logs
Monitor server console output in Event Viewer:
```
Windows Logs → Application → Filter by "iisnode"
```

## 🛠️ Step 9: Performance Optimization

### 9.1 Enable Compression
Add to `web.config`:
```xml
<httpCompression directory="%SystemDrive%\inetpub\temp\IIS Temporary Compressed Files">
  <scheme name="gzip" dll="%Windir%\system32\inetsrv\gzip.dll" />
  <dynamicTypes>
    <add mimeType="text/*" enabled="true" />
    <add mimeType="message/*" enabled="true" />
    <add mimeType="application/javascript" enabled="true" />
    <add mimeType="application/json" enabled="true" />
  </dynamicTypes>
  <staticTypes>
    <add mimeType="text/*" enabled="true" />
    <add mimeType="message/*" enabled="true" />
    <add mimeType="application/javascript" enabled="true" />
    <add mimeType="application/atom+xml" enabled="true" />
    <add mimeType="application/xaml+xml" enabled="true" />
  </staticTypes>
</httpCompression>
```

### 9.2 Enable Caching
Add to `web.config`:
```xml
<staticContent>
  <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
</staticContent>
```

## 🔧 Step 10: Maintenance

### 10.1 Regular Tasks
- Monitor SSL certificate expiration
- Backup database regularly
- Update Node.js dependencies
- Monitor disk space and performance

### 10.2 Backup Script
Create `C:\inetpub\gmsfeequick\backup.bat`:
```batch
@echo off
set BACKUP_DIR=C:\backups\gmsfeequick
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%

mkdir "%BACKUP_DIR%\%DATE%"
copy "C:\inetpub\gmsfeequick\server\registrations.db" "%BACKUP_DIR%\%DATE%\"
copy "C:\inetpub\gmsfeequick\.env.production" "%BACKUP_DIR%\%DATE%\"
```

## 🚨 Troubleshooting

### Common Issues:
1. **500 Internal Server Error**: Check iisnode logs
2. **Database permission denied**: Set proper folder permissions
3. **SSL not working**: Verify certificate installation
4. **API not responding**: Check Node.js process in Task Manager

### Useful Commands:
```powershell
# Restart IIS
iisreset

# Check Node.js processes
tasklist /fi "imagename eq node.exe"

# Test website locally
curl http://localhost/api/health
```

## 📞 Support

For issues with:
- **IIS Configuration**: Contact Windows Server administrator
- **SSL Certificate**: Contact certificate provider
- **Application Issues**: Check logs and contact development team

---

**🎉 Your Rotary GMS 2026 application is now hosted on IIS!**

The application will be available at: `https://gms.feequick.com`
