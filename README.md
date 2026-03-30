# Delegate Registration App

A full-stack application for managing delegate registrations with Razorpay payment integration.

## Features

- 🎫 Dynamic delegate registration form
- 💳 Razorpay payment integration
- 📊 Admin dashboard with statistics
- 📥 CSV export functionality
- 💾 SQLite local database
- 📱 Mobile responsive UI
- ✅ Payment verification and tracking

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS
- React Router
- Axios

**Backend:**
- Node.js with Express
- SQLite (better-sqlite3)
- Razorpay SDK
- JSON to CSV export

## Business Rules

- Each delegate costs ₹1000
- User enters contact details and club name
- User selects number of delegates (1-10)
- Form dynamically generates delegate name and designation fields
- Total amount = delegates × 1000
- All transactions are saved in database
- Payment status tracked (pending/success/failed)

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Razorpay account (for payment integration)

### Installation

1. **Clone and navigate to project directory**

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

   Or use the combined command:
   ```bash
   npm run install-all
   ```

4. **Configure environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Razorpay credentials:
   ```
   PORT=5000
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   FRONTEND_URL=http://localhost:3000
   ```

   **To get Razorpay credentials:**
   - Sign up at https://razorpay.com
   - Go to Settings → API Keys
   - Generate Test/Live keys
   - Use Test keys for development

5. **Initialize database**
   
   The database will be automatically created when you start the server for the first time.

### Running the Application

**Development mode (runs both frontend and backend):**
```bash
npm run dev
```

**Or run separately:**

Backend:
```bash
npm run server
```

Frontend (in another terminal):
```bash
npm run client
```

### Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Admin Dashboard:** http://localhost:3000/admin

## API Endpoints

### Public Endpoints

- `POST /api/registrations` - Create new registration
- `POST /api/create-order` - Create Razorpay order
- `POST /api/verify-payment` - Verify payment and update status

### Admin Endpoints

- `GET /api/admin/summary` - Get dashboard statistics
- `GET /api/admin/registrations` - Get all registrations with delegates
- `GET /api/admin/export-csv` - Export registrations to CSV

## Database Schema

### registrations
- id (PRIMARY KEY)
- name
- email
- phone
- club_name
- delegate_count
- total_amount
- payment_status (pending/success/failed)
- razorpay_order_id
- razorpay_payment_id
- created_at

### delegates
- id (PRIMARY KEY)
- registration_id (FOREIGN KEY)
- delegate_name
- delegate_designation

### transactions
- id (PRIMARY KEY)
- registration_id (FOREIGN KEY)
- razorpay_order_id
- razorpay_payment_id
- razorpay_signature
- amount
- status (created/success/failed)
- raw_response (JSON)
- created_at
- updated_at

## Usage Flow

1. **User Registration:**
   - Fill in contact details (name, email, phone)
   - Enter club name
   - Select number of delegates
   - Fill delegate names and designations
   - Review total amount
   - Proceed to payment

2. **Payment:**
   - Razorpay payment modal opens
   - User completes payment
   - Payment verified on backend
   - Success/failure page shown

3. **Admin Dashboard:**
   - View total registrations and revenue
   - See all registration details
   - Export data to CSV

## Testing

### Test Payment

Use Razorpay test cards:
- **Success:** 4111 1111 1111 1111
- **Failure:** 4111 1111 1111 1112
- CVV: Any 3 digits
- Expiry: Any future date

## Project Structure

```
delegate-registration-app/
├── server/
│   ├── index.js              # Express server
│   ├── database.js           # SQLite database setup
│   ├── routes/
│   │   ├── registrations.js  # Registration endpoints
│   │   └── admin.js          # Admin endpoints
│   └── utils/
│       └── razorpay.js       # Razorpay integration
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RegistrationForm.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── PaymentSuccess.tsx
│   │   │   └── PaymentFailure.tsx
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tailwind.config.js
├── package.json
├── .env.example
└── README.md
```

## Troubleshooting

### Database Issues
- Delete `registrations.db` and restart server to recreate database

### Port Already in Use
- Change PORT in `.env` file
- Update FRONTEND_URL accordingly

### Razorpay Payment Not Working
- Verify API keys in `.env`
- Check if using Test mode keys for development
- Ensure FRONTEND_URL matches your frontend URL

## Security Notes

- Never commit `.env` file
- Use test keys for development
- Implement proper authentication for admin dashboard in production
- Add rate limiting for API endpoints
- Validate all inputs on backend

## Future Enhancements

- Email notifications
- Payment receipts
- Bulk registration upload
- Advanced filtering and search
- Payment refund handling
- Multi-currency support

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
