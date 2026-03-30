# Quick Start Guide - Delegate Registration App

## ✅ Dependencies Installed Successfully!

Both backend and frontend dependencies are now installed and ready to use.

## 🔑 Step 1: Configure Razorpay Keys (Required)

The `.env` file has been created. You need to add your Razorpay credentials:

### Get Razorpay Test Keys (Free - Takes 2 minutes):

1. **Sign up at Razorpay:**
   - Go to https://razorpay.com
   - Click "Sign Up" (free account)
   - Complete registration

2. **Get Test Keys:**
   - Login to Razorpay Dashboard
   - Go to **Settings** → **API Keys**
   - Click **Generate Test Key**
   - Copy both `Key ID` and `Key Secret`

3. **Add to .env file:**
   
   Open `.env` file and replace the placeholder values:
   ```
   PORT=5000
   RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
   RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE
   FRONTEND_URL=http://localhost:3000
   ```

## 🚀 Step 2: Run the Application

Once you've added Razorpay keys to `.env`, run:

```bash
npm run dev
```

This will start both:
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:3000

## 🌐 Access the Application

- **Registration Form:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/admin

## 💳 Test Payment

Use these Razorpay test cards:

**Successful Payment:**
```
Card: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25
```

**Failed Payment:**
```
Card: 4111 1111 1111 1112
CVV: 123
Expiry: 12/25
```

## 📝 Sample Test Data

**Quick Test Registration:**
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

## ⚠️ Important Notes

1. **Use TEST mode keys only** - Never use live keys for development
2. **Database is created automatically** - No manual setup needed
3. **All transactions are saved** - Even failed/cancelled payments are tracked
4. **CSV export available** - From admin dashboard

## 🔧 Alternative: Run Separately

If you prefer to run backend and frontend separately:

**Terminal 1 (Backend):**
```bash
npm run server
```

**Terminal 2 (Frontend):**
```bash
npm run client
```

## 📚 More Information

- Full documentation: `README.md`
- Detailed setup: `SETUP_GUIDE.md`
- Test scenarios: `SAMPLE_DATA.md`

## 🆘 Troubleshooting

**Issue: "key_id is mandatory" error**
- Solution: Add Razorpay keys to `.env` file (see Step 1 above)

**Issue: Port already in use**
- Solution: Change PORT in `.env` to 5001 or another available port

**Issue: Payment modal not opening**
- Solution: Verify Razorpay keys are correct in `.env`

---

## ✨ You're All Set!

Once you add Razorpay keys to `.env`, just run `npm run dev` and start testing!
