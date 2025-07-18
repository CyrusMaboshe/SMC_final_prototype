# System Test Guide

## Assignment System Testing

### Test Accounts
- **Lecturer**: Use existing lecturer account
- **Student**: Use existing student account  
- **Accountant**: ACC001 / password123

### Assignment Workflow Test

1. **Lecturer Creates Assignment**
   - Login as lecturer
   - Go to "Manage Assignments" tab
   - Click "Create Assignment"
   - Fill in assignment details:
     - Title: "Test Assignment 1"
     - Course: Select any assigned course
     - Max Score: 100
     - Due Date: Set future date
     - Description: "This is a test assignment"
     - Instructions: "Submit your work as text or file"
   - Click "Create Assignment"
   - Verify assignment appears in list

2. **Student Submits Assignment**
   - Login as student
   - Go to "Submit Assignments" tab
   - Find the created assignment
   - Click "Submit Assignment"
   - Enter text submission or upload file
   - Click "Submit Assignment"
   - Verify submission success message
   - Check "Assignment Results" tab to see submitted status

3. **Lecturer Grades Assignment**
   - Login as lecturer
   - Go to "Manage Assignments" tab
   - Click "View Submissions" on the assignment
   - Find student submission
   - Click "Grade Submission"
   - Enter score and feedback
   - Click "Submit Grade"
   - Verify grading success

4. **Student Views Results**
   - Login as student
   - Go to "Assignment Results" tab
   - Verify assignment shows as "Graded"
   - Check score and feedback are displayed
   - Click "View Details" to see full submission details

## Financial System Testing

### Accountant Workflow Test

1. **Create Financial Record**
   - Login as accountant (ACC001 / password123)
   - Go to "Financial Ledger" tab
   - Click "Add Financial Record"
   - Select a student
   - Set academic year: 2024-2025
   - Set semester: 1
   - Enter fees:
     - Tuition Fee: 5000 (ZMW)
     - Accommodation Fee: 1500 (ZMW)
     - Other Fees: 500 (ZMW)
   - Set due date
   - Click "Create Record"
   - Verify record appears in ledger

2. **Record Payment**
   - In "Financial Ledger" tab
   - Click "Record Payment"
   - Select same student
   - Enter amount: 3000 (ZMW)
   - Select payment method: Cash
   - Enter reference number: REC001
   - Set payment date
   - Add notes: "Partial payment"
   - Click "Record Payment"
   - Verify payment appears in ledger
   - Check balance is updated correctly

3. **Student Views Financial Statement**
   - Login as student
   - Go to "Financial Statements" tab
   - Verify financial summary shows:
     - Total Owed: ZMW 7,000.00
     - Total Paid: ZMW 3,000.00
     - Outstanding Balance: ZMW 4,000.00
   - Check "Fee Records" tab for fee records
   - Check "Payment History" tab for payment records

## Real-time Updates Test

1. **Assignment Real-time Updates**
   - Open student dashboard in one browser tab
   - Open lecturer dashboard in another tab
   - Grade an assignment as lecturer
   - Verify student sees updated grade immediately (may need to refresh)

2. **Financial Real-time Updates**
   - Open student dashboard in one browser tab
   - Open accountant dashboard in another tab
   - Record a payment as accountant
   - Verify student sees updated balance immediately (may need to refresh)

## Security Test

1. **Role-based Access**
   - Try accessing `/accountant/dashboard` as student - should redirect
   - Try accessing `/lecturer/dashboard` as student - should redirect
   - Try accessing `/student/dashboard` as lecturer - should redirect

2. **Data Access Control**
   - Login as student
   - Verify can only see own assignments, results, and financial data
   - Login as lecturer
   - Verify can only see assignments for assigned courses
   - Login as accountant
   - Verify can see all student financial data

## Expected Results

### Assignment System
- ✅ Lecturers can create assignments for their courses
- ✅ Students can submit assignments before due date
- ✅ Lecturers can grade submissions with scores and feedback
- ✅ Students can view graded results in real-time
- ✅ File upload functionality works (simulated)
- ✅ Assignment status updates correctly

### Financial System
- ✅ Accountants can create financial records for students
- ✅ Accountants can record payments and update balances
- ✅ Students can view their financial statements
- ✅ Payment history is tracked accurately
- ✅ Balance calculations are correct
- ✅ Real-time updates work between accountant and student views

### Security
- ✅ Role-based access control works
- ✅ Users can only access their authorized data
- ✅ Database policies prevent unauthorized access
- ✅ Authentication redirects work correctly

## Troubleshooting

### Common Issues
1. **Real-time updates not working**: Check browser console for WebSocket errors
2. **Permission denied**: Verify user roles and database policies
3. **Assignment not showing**: Check course enrollment status
4. **Financial data not updating**: Verify accountant permissions

### Database Verification
```sql
-- Check assignment submissions
SELECT * FROM assignment_submissions WHERE student_id = 'student-uuid';

-- Check financial records
SELECT * FROM financial_records WHERE student_id = 'student-uuid';

-- Check payments
SELECT * FROM payments WHERE student_id = 'student-uuid';
```

## Performance Notes
- Real-time updates use Supabase WebSocket connections
- Large file uploads are simulated (would need storage integration)
- Database queries are optimized with proper indexes
- RLS policies ensure data security without performance impact

## Next Steps
1. Implement actual file storage for assignment submissions
2. Add email notifications for assignment grades and payment confirmations
3. Create detailed financial reports and analytics
4. Add bulk operations for accountants
5. Implement assignment deadline reminders
