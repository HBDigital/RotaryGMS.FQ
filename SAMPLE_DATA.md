# Sample Test Data

## Test Registration Data

Use this sample data to test the registration form:

### Sample 1: Single Delegate
```
Name: John Doe
Email: john.doe@example.com
Phone: 9876543210
Club Name: Tech Innovators Club
Number of Delegates: 1

Delegate 1:
- Name: John Doe
- Designation: President
```

### Sample 2: Multiple Delegates (3)
```
Name: Sarah Johnson
Email: sarah.johnson@example.com
Phone: 9876543211
Club Name: Business Leaders Association
Number of Delegates: 3

Delegate 1:
- Name: Sarah Johnson
- Designation: Chairperson

Delegate 2:
- Name: Michael Chen
- Designation: Vice President

Delegate 3:
- Name: Emily Rodriguez
- Designation: Secretary
```

### Sample 3: Large Group (5)
```
Name: David Kumar
Email: david.kumar@example.com
Phone: 9876543212
Club Name: Innovation Hub
Number of Delegates: 5

Delegate 1:
- Name: David Kumar
- Designation: CEO

Delegate 2:
- Name: Priya Sharma
- Designation: CTO

Delegate 3:
- Name: Alex Thompson
- Designation: CFO

Delegate 4:
- Name: Lisa Wang
- Designation: COO

Delegate 5:
- Name: James Brown
- Designation: Director
```

### Sample 4: Maximum Delegates (10)
```
Name: Robert Wilson
Email: robert.wilson@example.com
Phone: 9876543213
Club Name: Global Enterprise Network
Number of Delegates: 10

Delegate 1:
- Name: Robert Wilson
- Designation: Managing Director

Delegate 2:
- Name: Jennifer Lee
- Designation: Senior VP

Delegate 3:
- Name: Mohammed Ali
- Designation: VP Operations

Delegate 4:
- Name: Anna Kowalski
- Designation: VP Marketing

Delegate 5:
- Name: Carlos Garcia
- Designation: VP Sales

Delegate 6:
- Name: Yuki Tanaka
- Designation: Regional Manager

Delegate 7:
- Name: Sophie Martin
- Designation: Project Lead

Delegate 8:
- Name: Ahmed Hassan
- Designation: Team Lead

Delegate 9:
- Name: Maria Santos
- Designation: Senior Analyst

Delegate 10:
- Name: Tom Anderson
- Designation: Consultant
```

## Razorpay Test Cards

### Successful Payment
```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25
Name: Test User
```

### Failed Payment
```
Card Number: 4111 1111 1111 1112
CVV: 123
Expiry: 12/25
Name: Test User
```

### Other Test Cards

**Visa:**
- 4012 8888 8888 1881

**Mastercard:**
- 5555 5555 5555 4444

**American Express:**
- 3782 822463 10005

**Discover:**
- 6011 1111 1111 1117

## Test Scenarios

### Scenario 1: Successful Registration Flow
1. Fill form with Sample 1 data
2. Click "Proceed to Payment"
3. Use successful test card
4. Verify redirect to success page
5. Check admin dashboard for entry

### Scenario 2: Failed Payment
1. Fill form with Sample 2 data
2. Click "Proceed to Payment"
3. Use failed test card
4. Verify redirect to failure page
5. Check admin dashboard (should show pending/failed)

### Scenario 3: Payment Cancellation
1. Fill form with Sample 3 data
2. Click "Proceed to Payment"
3. Close Razorpay modal without paying
4. Verify registration is saved in database

### Scenario 4: Multiple Registrations
1. Register Sample 1 (successful payment)
2. Register Sample 2 (successful payment)
3. Register Sample 3 (failed payment)
4. Register Sample 4 (cancelled payment)
5. Check admin dashboard statistics

### Scenario 5: CSV Export
1. Complete multiple registrations
2. Go to admin dashboard
3. Click "Export CSV"
4. Verify CSV contains all successful registrations

## Expected Amounts

- 1 delegate = ₹1,000
- 2 delegates = ₹2,000
- 3 delegates = ₹3,000
- 4 delegates = ₹4,000
- 5 delegates = ₹5,000
- 10 delegates = ₹10,000

## Admin Dashboard Expected Data

After running all test scenarios, you should see:

**Summary Statistics:**
- Total Registrations: 2 (only successful payments)
- Total Delegates: 4 (1 from Sample 1 + 3 from Sample 2)
- Total Amount: ₹4,000
- Pending Payments: 1-2 (cancelled/failed)
- Failed Payments: 1

**Recent Transactions:**
- All 4 transactions visible
- Status: success, failed, pending

**All Registrations:**
- 4 registration cards
- Each showing delegate details
- Payment status badges
- Payment IDs for successful ones

## API Testing with cURL

### Create Registration
```bash
curl -X POST http://localhost:5000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "club_name": "Test Club",
    "delegate_count": 2,
    "delegates": [
      {"name": "Delegate 1", "designation": "President"},
      {"name": "Delegate 2", "designation": "VP"}
    ]
  }'
```

### Get Admin Summary
```bash
curl http://localhost:5000/api/admin/summary
```

### Get All Registrations
```bash
curl http://localhost:5000/api/admin/registrations
```

### Export CSV
```bash
curl http://localhost:5000/api/admin/export-csv -o registrations.csv
```

## Validation Test Cases

### Should Pass:
- Valid email formats
- 10-digit phone numbers
- 1-10 delegates
- All required fields filled

### Should Fail:
- Invalid email (missing @, domain)
- Phone < 10 digits or > 10 digits
- Empty delegate names/designations
- Delegate count mismatch
- Missing required fields

## Performance Testing

### Load Test Scenario:
1. Create 50 registrations
2. Check database size
3. Test admin dashboard load time
4. Export CSV with 50 records
5. Verify all data integrity

## Security Testing

### Test Cases:
1. SQL injection in form fields
2. XSS in delegate names
3. Payment signature verification
4. CORS policy enforcement
5. Input sanitization

## Notes

- All test data is fictional
- Use test mode Razorpay keys only
- Database can be reset by deleting `registrations.db`
- Test in different browsers for compatibility
- Check mobile responsiveness with various screen sizes
