# Rotary GMS 2026 Registration System - Project Recreation Prompt

## Project Overview
Create a full-stack web application for Rotary District 3206 Governor's Meet & Seminar (GMS) 2026 registration system with payment integration, admin dashboard, and comprehensive reporting features.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Create React App
- **Routing**: React Router DOM
- **Payment**: Razorpay integration
- **Excel Export**: ExcelJS (client-side)

### Backend
- **Runtime**: Node.js with Express
- **Database**: SQLite with sql.js (in-memory with persistence)
- **Payment Gateway**: Razorpay
- **Email**: Nodemailer
- **WhatsApp**: Custom API integration (askeva.in)
- **Excel Export**: ExcelJS (server-side)
- **Security**: bcrypt for password hashing, crypto for tokens

### Deployment
- **Server**: Ubuntu on AWS
- **Web Server**: Nginx (reverse proxy + static file serving)
- **Process Manager**: PM2
- **SSL**: Let's Encrypt
- **Domain**: gms.feequick.com

## Core Features

### 1. Public Registration Form
**Route**: `/`

**Features**:
- Multi-delegate registration (1-5 delegates per club)
- Real-time form validation
- Dynamic club selection from database
- Designation-based pricing:
  - Required designations (₹1500 each):
    - President 2025-26
    - President Elect (2026-27)
    - Treasurer 2026-27
    - Secretary elect 2026-27
    - TRF Chair 2026-27
  - Other designations (₹1000 each):
    - Member, Rotaract, Assistant Governor, GGR, District Director, District official
- Automatic receipt number generation (format: GMS2026/XXXXX)
- Razorpay payment integration
- Email receipt with PDF attachment
- WhatsApp notification with receipt
- Dynamic registration closure date (configurable from admin panel)
- Indian Standard Time (IST) based closure logic

**Form Fields**:
- Contact person name, email, phone
- Club name (dropdown from database)
- Number of delegates (1-5)
- For each delegate: Name and Designation

**Payment Flow**:
1. User fills form and submits
2. Backend creates registration (status: pending) and Razorpay order
3. Frontend opens Razorpay checkout modal
4. On successful payment, backend verifies signature
5. Update registration status to 'success'
6. Generate receipt number
7. Send email and WhatsApp notifications

### 2. Admin Login
**Route**: `/admin-login`

**Features**:
- Username/password authentication
- SHA-256 password hashing
- Session management (sessionStorage)
- Two user roles:
  - **Admin**: Full access (username: vivek, password: vivek)
  - **Viewer**: Read-only access (username: rid3206, password: rid3206)

### 3. Admin Dashboard
**Route**: `/admin`

**Tabs**:

#### A. Recent Transactions (Admin only)
- Last 10 transactions with pagination
- Real-time auto-refresh every 30 seconds
- Display: Receipt #, Name, Club, Amount, Status, Payment ID, Date
- Email/WhatsApp status badges
- Export to Excel functionality

#### B. All Registrations
- Complete list of all successful registrations
- Display: Receipt #, Name, Email, Phone, Club, Delegates count, Amount, Payment details
- Delegate details with designations
- Email/WhatsApp notification status
- Export to Excel with detailed delegate information

#### C. Designation Report
**Three sub-tabs**:

1. **By Designation**:
   - Group registrations by designation
   - Show count and list of people per designation
   - Export to Excel

2. **By Club**:
   - Group registrations by club name
   - Show count and list of designations per club
   - Export to Excel

3. **DD Wise** (NEW):
   - Hierarchical view: District Director → Assistant Governor → GGR → Club → Delegates
   - Excel export with 2 sheets:
     - Sheet 1: DD-wise report with merged cells, headers (District Director, Assistant Governor, GGR, Clubs, District Official Name, Registered Name, Sign)
     - Sheet 2: All registrations (Name, Club Name, Designation)

#### D. District Report
- Hierarchical club compliance tracking
- Structure: Zone → District Director → Assistant Governor → Clubs
- For each club, track required designations (5 mandatory)
- Status indicators:
  - ✓ Completed (all 5 designations registered)
  - ⚠ Partial (some designations missing)
  - ✗ Not registered
- Club participation closure feature (mark clubs as "Not Participating")
- Send reminders to Assistant Governors (once per day limit)
- Filter by club/AG name
- Export district report to CSV
- Manual entry for offline payments (NEFT/CASH/QR)

#### E. Settings (Admin only)
- **Registration Closure Date Management**:
  - View current closure date
  - Update closure date with date picker
  - Instant effect across entire application
  - Date stored in database settings table
  - IST timezone handling

### 4. Payment Success Page
**Route**: `/payment-success`

**Features**:
- Display receipt number, amount, payment ID
- Show registered delegates
- Success message with event details
- Link back to home

## Database Schema

### Tables

#### 1. registrations
```sql
CREATE TABLE registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  club_name TEXT NOT NULL,
  delegate_count INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  receipt_no TEXT,
  email_status TEXT DEFAULT 'pending',
  whatsapp_status TEXT DEFAULT 'pending',
  payment_mode TEXT DEFAULT 'online',
  payment_reference TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. delegates
```sql
CREATE TABLE delegates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id INTEGER NOT NULL,
  delegate_name TEXT NOT NULL,
  delegate_designation TEXT NOT NULL,
  FOREIGN KEY (registration_id) REFERENCES registrations(id)
);
```

#### 3. transactions
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_id INTEGER,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount REAL,
  status TEXT,
  raw_response TEXT,
  updated_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES registrations(id)
);
```

#### 4. clubs
```sql
CREATE TABLE clubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER DEFAULT 1,
  zone INTEGER DEFAULT NULL,
  district_director TEXT DEFAULT NULL,
  assistant_governor TEXT DEFAULT NULL,
  ggr TEXT DEFAULT NULL,
  ag_phone TEXT DEFAULT NULL,
  participation_closed INTEGER DEFAULT 0
);
```

#### 5. reminder_log
```sql
CREATE TABLE reminder_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ag_name TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. admin_users
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. settings (NEW)
```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Default Settings**:
- `registration_close_date_ist`: '2026-05-03'

## API Endpoints

### Public Endpoints

#### Registration
- `POST /api/registrations` - Create new registration
- `GET /api/clubs` - Get list of active clubs

#### Settings
- `GET /api/settings/registration-close-date` - Get current closure date

### Admin Endpoints (require authentication)

#### Dashboard Data
- `GET /api/admin/summary` - Get dashboard summary stats
- `GET /api/admin/recent-transactions?page=1&limit=10` - Get paginated transactions
- `GET /api/admin/registrations` - Get all successful registrations

#### Reports
- `GET /api/admin/designation-report` - Get designation-wise report
- `GET /api/admin/club-designation-report` - Get club-wise report
- `GET /api/admin/dd-wise-report` - Get DD-wise hierarchical report
- `GET /api/admin/district-report` - Get district compliance report
- `GET /api/admin/unregistered-clubs` - Get clubs not yet registered

#### Excel Exports
- `GET /api/admin/export-excel` - Export all registrations
- `GET /api/admin/export-designation-excel?view=designation|club` - Export designation report
- `GET /api/admin/export-dd-wise-excel` - Export DD-wise report (2 sheets)
- `GET /api/admin/export-district-csv` - Export district report as CSV

#### Actions
- `POST /api/admin/manual-designation-payment` - Record offline payment
- `POST /api/admin/club-participation` - Toggle club participation status
- `POST /api/admin/send-ag-reminder` - Send reminder to AG

#### Settings
- `POST /api/admin/settings/registration-close-date` - Update closure date

### Payment Endpoints
- `POST /api/payment/verify` - Verify Razorpay payment signature
- `POST /api/payment/capture` - Capture payment (if needed)

## Key Business Logic

### 1. Receipt Number Generation
```javascript
Format: GMS2026/XXXXX
- Query max receipt number from database
- Extract numeric part, increment by 1
- Pad with zeros to 5 digits
- Prefix with "GMS2026/"
```

### 2. Amount Calculation
```javascript
REQUIRED_DESIGNATIONS = [
  'President 2025-26',
  'President Elect(2026-27)',
  'Treasurer 2026-27',
  'Secretary elect 2026-27',
  'TRF Chair 2026-27'
];

for each delegate:
  if designation in REQUIRED_DESIGNATIONS:
    amount += 1500
  else:
    amount += 1000
```

### 3. Registration Closure Logic (IST)
```javascript
// Get closure date from database settings
const closeDate = await getRegistrationCloseDate(); // e.g., '2026-05-03'

// Parse date
const [year, month, day] = closeDate.split('-').map(Number);

// Calculate UTC timestamp for midnight IST on closure date
const istOffsetMs = (5 * 60 + 30) * 60 * 1000; // IST is UTC+5:30
const closeAtUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0) - istOffsetMs;

// Check if current time is past closure
const isClosed = Date.now() >= closeAtUtcMs;
```

### 4. District Compliance Tracking
```javascript
REQUIRED_DESIGNATIONS = 5 designations (listed above)

For each club:
  - Query all successful registrations for that club
  - Extract unique designations from delegates
  - Compare with REQUIRED_DESIGNATIONS
  - Status:
    - 'completed': All 5 present
    - 'partial': Some present, some missing
    - 'not_registered': None present
```

### 5. Email Notification
```javascript
// Using Nodemailer
- SMTP configuration from environment variables
- Send HTML email with:
  - Event details (Date: 03 May 2026, Venue: Grant Regent Hotel, Coimbatore)
  - Receipt number
  - Club name
  - Delegate list with designations
  - Total amount
  - Payment ID
  - Contact information
```

### 6. WhatsApp Notification
```javascript
// Using askeva.in API
- POST to WhatsApp API endpoint
- Send message with:
  - Receipt number
  - Club name
  - Delegate count
  - Total amount
  - Event details
```

## Environment Variables

### Backend (.env)
```
PORT=5001
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
FRONTEND_URL=https://gms.feequick.com

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com

# WhatsApp API
WHATSAPP_API_URL=https://api.askeva.in/send
WHATSAPP_API_KEY=your_whatsapp_api_key

# Admin Credentials
ADMIN_USERNAME=vivek
ADMIN_PASSWORD=vivek
VIEWER_USERNAME=rid3206
VIEWER_PASSWORD=rid3206

# Registration Settings (optional, can be managed via admin panel)
REGISTRATION_CLOSE_DATE_IST=2026-05-03
```

### Frontend (.env)
```
REACT_APP_API_URL=https://gms.feequick.com/api
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## File Structure

```
RotaryGMS.FQ/
├── client/                          # React frontend
│   ├── public/
│   │   ├── index.html
│   │   └── rotary-logo.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── RegistrationForm.tsx      # Main registration form
│   │   │   ├── AdminLogin.tsx            # Admin login page
│   │   │   ├── AdminDashboard.tsx        # Admin dashboard with all tabs
│   │   │   └── PaymentSuccess.tsx        # Payment success page
│   │   ├── App.tsx                       # Main app with routing
│   │   ├── index.tsx                     # Entry point
│   │   └── index.css                     # TailwindCSS styles
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                          # Node.js backend
│   ├── routes/
│   │   ├── registrations.js              # Registration endpoints
│   │   └── admin.js                      # Admin endpoints
│   ├── utils/
│   │   ├── razorpay.js                   # Razorpay integration
│   │   ├── email.js                      # Email sending
│   │   └── whatsapp.js                   # WhatsApp integration
│   ├── database.js                       # SQLite database setup
│   ├── index.js                          # Express server entry
│   └── package.json
│
├── registrations.db                 # SQLite database file
└── README.md
```

## Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name gms.feequick.com;
    
    ssl_certificate /etc/letsencrypt/live/gms.feequick.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gms.feequick.com/privkey.pem;
    
    # API Routes - Proxy to Node.js
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
    }
    
    # Serve React App
    location / {
        root /var/www/gmsfeequick/RotaryGMS.FQ/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## PM2 Configuration

```bash
# Start backend server
pm2 start server/index.js --name gmsfeequick

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## Deployment Steps

1. **Server Setup**:
   ```bash
   # Install Node.js, Nginx, PM2
   sudo apt update
   sudo apt install nodejs npm nginx
   sudo npm install -g pm2
   ```

2. **Clone Repository**:
   ```bash
   cd /var/www/gmsfeequick
   git clone <repository-url> RotaryGMS.FQ
   ```

3. **Backend Setup**:
   ```bash
   cd RotaryGMS.FQ/server
   npm install
   # Create .env file with environment variables
   pm2 start index.js --name gmsfeequick
   ```

4. **Frontend Build**:
   ```bash
   cd ../client
   npm install
   npm run build
   ```

5. **Nginx Configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/gmsfeequick
   sudo ln -s /etc/nginx/sites-available/gmsfeequick /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **SSL Certificate**:
   ```bash
   sudo certbot --nginx -d gms.feequick.com
   ```

## Special Features & Considerations

### 1. Dynamic Registration Closure
- Closure date stored in database (settings table)
- Configurable from admin panel Settings tab
- No code changes needed to update closure date
- IST timezone handling for accurate closure time
- Instant effect across frontend and backend

### 2. Receipt Number System
- Sequential numbering: GMS2026/00001, GMS2026/00002, etc.
- Thread-safe generation (database-level)
- Unique constraint on receipt_no column

### 3. Club Data Management
- 53+ clubs pre-seeded in database
- Hierarchical structure: Zone → DD → AG → GGR → Club
- AG phone numbers for reminder notifications
- Participation closure feature for non-participating clubs

### 4. Payment Security
- Razorpay signature verification
- HMAC SHA256 validation
- Transaction logging with raw responses
- Idempotent payment capture

### 5. Notification System
- Email: HTML templates with event branding
- WhatsApp: API integration with delivery tracking
- Status tracking: pending/sent/failed
- Retry mechanism for failed notifications

### 6. Excel Export Features
- Multiple export formats (XLSX, CSV)
- Multi-sheet workbooks for complex reports
- Merged cells for hierarchical data
- Custom styling (borders, fonts, colors)
- Proper column widths and formatting

### 7. Role-Based Access Control
- Admin: Full CRUD access
- Viewer: Read-only access
- Conditional UI rendering based on role
- Session-based authentication

### 8. Real-Time Updates
- Auto-refresh transactions every 30 seconds
- Live status updates without page reload
- Optimistic UI updates for better UX

## Testing Checklist

### Registration Flow
- [ ] Form validation works correctly
- [ ] Club dropdown populates from database
- [ ] Amount calculation is accurate
- [ ] Razorpay payment modal opens
- [ ] Payment success updates database
- [ ] Receipt number generated correctly
- [ ] Email sent successfully
- [ ] WhatsApp notification sent
- [ ] Redirect to success page works

### Admin Dashboard
- [ ] Login with admin credentials
- [ ] Login with viewer credentials
- [ ] Recent transactions display correctly
- [ ] All registrations load
- [ ] Designation report shows correct data
- [ ] DD-wise report displays hierarchy
- [ ] District report compliance tracking works
- [ ] Excel exports download successfully
- [ ] Manual payment entry works
- [ ] Club participation toggle works
- [ ] AG reminders send (once per day limit)
- [ ] Settings tab updates closure date

### Registration Closure
- [ ] Form shows closure message after date
- [ ] Backend rejects registrations after closure
- [ ] Admin can update closure date
- [ ] Updated date takes effect immediately

### Excel Exports
- [ ] All registrations export has correct data
- [ ] Designation report export works (both views)
- [ ] DD-wise export has 2 sheets with correct format
- [ ] District CSV export downloads
- [ ] File names include timestamp

## Additional Notes

### Database Initialization
- Database auto-creates on first run
- Migrations run automatically
- Default admin users seeded
- Club data seeded from predefined list
- District hierarchy seeded (Zone, DD, AG, GGR)

### Error Handling
- All API endpoints have try-catch blocks
- User-friendly error messages
- Console logging for debugging
- Transaction rollback on payment failures

### Performance Optimizations
- Database indexes on foreign keys
- Pagination for large datasets
- Lazy loading for reports
- Cached static assets (1 year)
- Gzip compression enabled

### Security Measures
- Password hashing (SHA-256)
- HTTPS only
- CORS configuration
- SQL injection prevention (parameterized queries)
- XSS protection headers
- Rate limiting (consider adding)

## Future Enhancements (Optional)

1. **Email Templates**: Rich HTML templates with inline CSS
2. **PDF Receipts**: Generate PDF receipts instead of plain text
3. **SMS Notifications**: Add SMS alongside WhatsApp
4. **Bulk Import**: Import club data from CSV/Excel
5. **Advanced Filtering**: Filter registrations by date range, club, designation
6. **Dashboard Analytics**: Charts and graphs for registration trends
7. **Audit Logs**: Track all admin actions
8. **Two-Factor Authentication**: Enhanced security for admin login
9. **Mobile App**: React Native app for on-site registration
10. **QR Code Check-in**: Generate QR codes for event check-in

---

## Quick Start Commands

### Development
```bash
# Backend
cd server
npm install
npm run dev

# Frontend
cd client
npm install
npm start
```

### Production Build
```bash
# Frontend
cd client
npm run build

# Backend
cd server
pm2 start index.js --name gmsfeequick
```

### Database Reset (Development Only)
```bash
# Delete database file
rm registrations.db

# Restart server (will recreate database)
pm2 restart gmsfeequick
```

---

**Event Details**:
- **Event**: Rotary District 3206 Governor's Meet & Seminar 2026
- **Date**: 03 May 2026
- **Venue**: Grant Regent Hotel, Coimbatore
- **Registration Fee**: ₹1500 (required designations), ₹1000 (others)
- **Contact**: District officials via registered email/phone

This prompt contains all the information needed to recreate the Rotary GMS 2026 registration system from scratch.
