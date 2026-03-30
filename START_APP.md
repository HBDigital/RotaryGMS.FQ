# 🚀 Start the Delegate Registration App

## ✅ Current Status
- ✅ Dependencies installed
- ✅ Backend tested and working
- ✅ Database initialized
- ⚠️ Razorpay keys needed for payment

## 🎯 Quick Start (2 Commands)

### 1. Start Backend (Port 5001)
```bash
PORT=5001 npm run server
```
**Note:** Using port 5001 because port 5000 is used by macOS AirPlay

### 2. Start Frontend (Port 3000)
Open a new terminal:
```bash
cd client
npm start
```

## 🌐 Access the Application

- **Registration Form:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/admin
- **API Health Check:** http://localhost:5001/api/health

## 🔑 Enable Payment (Optional)

To enable Razorpay payment integration:

1. **Get Razorpay Test Keys:**
   - Sign up at https://razorpay.com
   - Go to Settings → API Keys → Generate Test Key
   - Copy Key ID and Key Secret

2. **Edit `.env` file:**
   ```
   PORT=5001
   RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_HERE
   RAZORPAY_KEY_SECRET=YOUR_SECRET_HERE
   FRONTEND_URL=http://localhost:3000
   ```

3. **Restart backend:**
   ```bash
   pkill -f "node server"
   PORT=5001 npm run server
   ```

## 📝 Test the Application

### Test Registration (Without Payment)
You can test the registration form even without Razorpay keys. The data will be saved with "pending" payment status.

**Sample Test Data:**
```
Name: John Doe
Email: john.doe@example.com
Phone: 9876543210
Club Name: Tech Club
Number of Delegates: 2

Delegate 1:
- Name: John Doe
- Designation: President

Delegate 2:
- Name: Jane Smith
- Designation: Vice President
```

### Test with cURL
```bash
# Test health
curl http://localhost:5001/api/health

# Create registration
curl -X POST http://localhost:5001/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "club_name": "Test Club",
    "delegate_count": 2,
    "delegates": [
      {"name": "Delegate One", "designation": "President"},
      {"name": "Delegate Two", "designation": "Vice President"}
    ]
  }'

# Check admin summary
curl http://localhost:5001/api/admin/summary
```

## 🎨 What You'll See

### Registration Form
- Clean, modern UI with Tailwind CSS
- Dynamic delegate fields (add 1-10 delegates)
- Real-time validation
- Total amount calculation (₹1000 per delegate)

### Admin Dashboard
- Total registrations and revenue
- Delegate count
- Pending/failed payments
- Recent transactions
- Full registration details with delegates
- CSV export button

## 💳 Test Payment (With Razorpay Keys)

**Test Cards:**
- **Success:** 4111 1111 1111 1111
- **Failure:** 4111 1111 1111 1112
- CVV: Any 3 digits
- Expiry: Any future date

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Kill existing process
pkill -f "node server"

# Or use different port
PORT=5002 npm run server
```

### Database Issues
```bash
# Reset database
rm registrations.db
PORT=5001 npm run server
```

### Frontend Not Starting
```bash
cd client
rm -rf node_modules
npm install
npm start
```

## 📊 Features Available

### ✅ Working Now (No Razorpay needed)
- Registration form with validation
- Dynamic delegate fields
- Database storage
- Admin dashboard
- Statistics and analytics
- CSV export
- All registrations view

### ⚠️ Requires Razorpay Keys
- Payment processing
- Razorpay modal
- Payment verification
- Success/failure pages
- Payment status updates

## 🎉 You're All Set!

The application is fully functional. Just start both servers and access http://localhost:3000

For payment features, add Razorpay keys to `.env` file.

---

**Need Help?**
- Check `TEST_REPORT.md` for detailed test results
- See `README.md` for full documentation
- View `QUICK_START.md` for setup instructions
