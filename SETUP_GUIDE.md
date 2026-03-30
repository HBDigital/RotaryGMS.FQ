# Delegate Registration App - Quick Setup Guide

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- Razorpay account (for payment integration)

## Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

Or use the combined command:
```bash
npm run install-all
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Razorpay credentials:
```
PORT=5000
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here
FRONTEND_URL=http://localhost:3000
```

3. Copy the frontend environment file:
```bash
cd client
cp .env.example .env
cd ..
```

### Step 3: Get Razorpay Credentials

1. Sign up at https://razorpay.com
2. Go to Settings → API Keys
3. Generate Test Mode keys
4. Copy `Key ID` and `Key Secret` to your `.env` file

### Step 4: Run the Application

**Option A: Run both frontend and backend together (recommended)**
```bash
npm run dev
```

**Option B: Run separately**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

### Step 5: Access the Application

- **Registration Form:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/admin
- **Backend API:** http://localhost:5000

## Testing Payment

Use these Razorpay test cards:

**Successful Payment:**
- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

**Failed Payment:**
- Card: 4111 1111 1111 1112
- CVV: Any 3 digits
- Expiry: Any future date

## Common Issues & Solutions

### Issue: Port already in use

**Solution:** Change the PORT in `.env` file
```
PORT=5001
```

### Issue: Database locked

**Solution:** Delete the database file and restart
```bash
rm registrations.db
npm run server
```

### Issue: Cannot find module errors

**Solution:** Reinstall dependencies
```bash
rm -rf node_modules client/node_modules
npm run install-all
```

### Issue: Razorpay payment not opening

**Solution:** 
- Verify Razorpay keys in `.env`
- Check browser console for errors
- Ensure you're using Test mode keys

## Project Structure

```
delegate-registration-app/
├── server/                    # Backend (Node.js + Express)
│   ├── index.js              # Main server file
│   ├── database.js           # SQLite database setup
│   ├── routes/
│   │   ├── registrations.js  # Registration & payment endpoints
│   │   └── admin.js          # Admin dashboard endpoints
│   └── utils/
│       └── razorpay.js       # Razorpay integration
├── client/                    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── RegistrationForm.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── PaymentSuccess.tsx
│   │   │   └── PaymentFailure.tsx
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── package.json
├── package.json
├── .env.example
└── README.md
```

## API Endpoints

### Public Endpoints

**POST /api/registrations**
- Create new registration
- Body: `{ name, email, phone, club_name, delegate_count, delegates }`

**POST /api/create-order**
- Create Razorpay order
- Body: `{ registrationId, amount }`

**POST /api/verify-payment**
- Verify payment signature
- Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId }`

### Admin Endpoints

**GET /api/admin/summary**
- Get dashboard statistics

**GET /api/admin/registrations**
- Get all registrations with delegate details

**GET /api/admin/export-csv**
- Export registrations to CSV

## Database Schema

### registrations table
- id, name, email, phone, club_name
- delegate_count, total_amount, payment_status
- razorpay_order_id, razorpay_payment_id
- created_at

### delegates table
- id, registration_id
- delegate_name, delegate_designation

### transactions table
- id, registration_id
- razorpay_order_id, razorpay_payment_id, razorpay_signature
- amount, status, raw_response
- created_at, updated_at

## Features Checklist

✅ Dynamic delegate form (1-10 delegates)
✅ Form validation (frontend & backend)
✅ Razorpay payment integration
✅ Payment verification with signature
✅ Transaction tracking (all states)
✅ Admin dashboard with statistics
✅ CSV export functionality
✅ Mobile responsive design
✅ Success/failure pages
✅ SQLite local database

## Next Steps

1. **Production Deployment:**
   - Use production Razorpay keys
   - Add authentication to admin dashboard
   - Set up proper database backups
   - Configure HTTPS

2. **Enhancements:**
   - Email notifications
   - Payment receipts (PDF)
   - Bulk registration upload
   - Search and filter in admin
   - Payment refund handling

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the README.md file
3. Check browser console for errors
4. Verify all environment variables are set

## License

MIT
