# 🔧 Fix Payment Gateway & Dashboard Errors

## Issues Identified

### 1. ❌ Payment Gateway Error
**Problem:** Razorpay keys are placeholder values in `.env`  
**Current values:**
```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 2. ❌ Dashboard Error  
**Problem:** Frontend needs restart to pick up new API URL (port 5001)

---

## ✅ Solutions

### Fix 1: Configure Razorpay Keys

**Option A: Get Real Razorpay Keys (For Payment Testing)**

1. Sign up at https://razorpay.com
2. Go to Settings → API Keys → Generate Test Key
3. Edit `.env` file and replace with your keys:
   ```
   PORT=5001
   RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_HERE
   RAZORPAY_KEY_SECRET=YOUR_ACTUAL_SECRET_HERE
   FRONTEND_URL=http://localhost:3000
   ```
4. Restart backend:
   ```bash
   pkill -f "node server"
   PORT=5001 npm run server
   ```

**Option B: Test Without Payment (Skip Payment Gateway)**

The app works fine without Razorpay keys! You can:
- ✅ Create registrations (saved as "pending")
- ✅ View admin dashboard
- ✅ Export CSV
- ❌ Cannot process actual payments

To test without payment, just use the app as-is. Registrations will be saved with "pending" status.

---

### Fix 2: Restart Frontend

The frontend needs to restart to use the correct backend port (5001).

**Steps:**

1. **Stop React** (press Ctrl+C in the React terminal)

2. **Restart React:**
   ```bash
   cd client
   npm start
   ```

3. **Verify it's working:**
   - Open http://localhost:3000
   - Fill registration form
   - Submit (will save as pending if no Razorpay keys)
   - Check http://localhost:3000/admin

---

## 🧪 Quick Test (Without Razorpay)

### Test Registration:
```
Name: John Doe
Email: john@example.com
Phone: 9876543210
Club Name: Tech Club
Delegates: 2
  - Delegate 1: John Doe (President)
  - Delegate 2: Jane Smith (VP)
```

**Expected Result:**
- ✅ Registration created successfully
- ✅ Shows "Payment pending" or similar message
- ✅ Data visible in admin dashboard
- ✅ Can export to CSV

---

## 🔍 Verify Everything is Working

### Check Backend:
```bash
curl http://localhost:5001/api/health
# Should return: {"status":"OK","message":"Server is running"}
```

### Check Admin API:
```bash
curl http://localhost:5001/api/admin/summary
# Should return JSON with summary data
```

### Check Frontend:
- Open http://localhost:3000 (registration form)
- Open http://localhost:3000/admin (dashboard)

---

## 📊 Current Status

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Backend | ✅ Running (port 5001) | None |
| Database | ✅ Working | None |
| API Endpoints | ✅ Working | None |
| Frontend Config | ✅ Fixed | **Restart React** |
| Payment Gateway | ⚠️ Needs Keys | Optional - add Razorpay keys |

---

## 🎯 Next Steps

### Minimum (App Works Now):
1. Restart React frontend
2. Test registration form
3. View admin dashboard

### Full Payment Testing:
1. Get Razorpay test keys
2. Update `.env` with real keys
3. Restart backend
4. Test complete payment flow

---

## 💡 Important Notes

- **Port 5001** is used because macOS AirPlay uses port 5000
- **Razorpay keys are optional** - app works without them (pending status)
- **Frontend must restart** to pick up environment variable changes
- **All registrations are saved** regardless of payment status

---

## 🆘 Still Having Issues?

### Dashboard shows error:
- Make sure React is restarted
- Check browser console (F12) for error messages
- Verify backend is running: `lsof -i :5001`

### Payment gateway error:
- This is expected without Razorpay keys
- Add real keys to `.env` to enable payments
- Or continue testing without payment (pending status)

### Registration fails:
- Check backend logs: `tail -f server.log`
- Verify API URL in browser Network tab (F12)
- Should be calling `http://localhost:5001/api/registrations`

---

**TL;DR: Restart React frontend. Payment gateway error is expected without Razorpay keys (optional).**
