# ⚠️ Frontend Configuration Updated

## Issue Fixed
The frontend was trying to connect to port 5000, but the backend is running on port 5001.

## ✅ Solution Applied
Created `client/.env` file with correct API URL:
```
REACT_APP_API_URL=http://localhost:5001/api
```

## 🔄 Required Action: Restart React Dev Server

### If React is running, stop it:
Press `Ctrl+C` in the terminal where React is running

### Then restart:
```bash
cd client
npm start
```

The frontend will now connect to the correct backend port (5001) and registration will work!

## 🧪 Test After Restart

1. Open http://localhost:3000
2. Fill in the registration form
3. Click "Proceed to Payment"
4. Registration should now work successfully!

---

**Note:** React requires a restart to pick up new environment variables.
