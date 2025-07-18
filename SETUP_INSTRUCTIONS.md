# Payment-Based Access Control System - Setup Instructions

## Quick Setup Guide

### 1. Database Setup

Execute the SQL schema file to create the necessary tables and functions:

```sql
-- Run this in your Supabase SQL editor or PostgreSQL database
\i database/access_control_schema.sql
```

This will create:
- `payment_approvals` table
- `semester_periods` table  
- `student_semester_registrations` table
- `access_control_logs` table
- Database functions for access control
- Indexes for performance
- Triggers for automatic updates

### 2. Test the System

#### Step 1: Create a Semester Period
1. Login as an accountant
2. Navigate to **Access Control** → **Semester Management**
3. Click **"Create New Semester"**
4. Fill in the form:
   - Semester Name: "Fall Semester 2024"
   - Academic Year: "2024-2025"
   - Semester Number: 1
   - Start Date: Current date
   - End Date: 3 months from now
   - Registration dates: Current period
   - Check "Set as Active Semester"
   - Check "Open Registration"
5. Click **"Create Semester"**

#### Step 2: Approve a Student Payment
1. Navigate to **Access Control** → **Payment Approvals**
2. Click **"Approve New Payment"**
3. Fill in the form:
   - Select a student
   - Amount Paid: $1000
   - Payment Reference: "TEST001"
   - Payment Date: Today
   - Access Valid From: Today
   - Access Valid Until: 2 months from now
   - Notes: "Test payment approval"
4. Click **"Approve Payment"**

#### Step 3: Deploy Payment Verification System
1. Run the payment verification functions in Supabase SQL Editor:
```sql
-- Copy and paste the contents of database/payment_verification_functions.sql
-- This creates the database-level payment verification system
```

#### Step 4: Register Student for Semester
1. Navigate to **Access Control** → **Student Registrations**
2. Click **"Register Student for Semester"**
3. Select a student and semester
4. The system will automatically verify payment approval through the database
5. Registration will only succeed if payment verification passes

**Database-Level Verification**: The system now uses the `register_student_with_payment_verification()` function which:
- Verifies payment approval at the database level
- Ensures students cannot be registered without valid payment
- Provides detailed verification results and error messages
- Logs all verification attempts for audit purposes

#### Step 5: Test Payment Verification System
1. Open `test-payment-verification.html` in your browser
2. Click **"Run Complete Payment Verification Test"**
3. Verify all tests pass:
   - Database functions are properly deployed
   - Payment verification logic works correctly
   - Registration with verification functions properly
4. Check individual test sections for detailed results

**Expected Results**:
- ✅ Database functions exist and are callable
- ✅ Payment verification returns appropriate results
- ✅ Registration verification enforces payment requirements
- ⚠️ Students without payment approval are denied registration

#### Step 4: Test Student Access
1. Login as the student
2. Verify access status in dashboard header
3. Check that all modules are accessible
4. Verify real-time updates work

### 3. Testing Access Denial

#### Test Payment Expiration
1. Update a payment approval to have expired dates:
```sql
UPDATE payment_approvals 
SET access_valid_until = CURRENT_DATE - 1
WHERE student_id = 'student-uuid-here';
```
2. Student should lose access immediately

#### Test Semester Registration
1. Update semester registration status:
```sql
UPDATE student_semester_registrations 
SET registration_status = 'rejected'
WHERE student_id = 'student-uuid-here';
```
2. Student should lose access immediately

### 4. Verify Real-Time Features

#### Test Real-Time Updates
1. Have student logged in
2. As accountant, approve/reject a payment
3. Student dashboard should update within 2 minutes
4. Check browser console for real-time logs

#### Test Automatic Expiration
1. Run maintenance function:
```sql
SELECT run_access_control_maintenance();
```
2. Check that expired payments are marked as expired
3. Verify students lose access automatically

### 5. Monitor System Health

#### Check Access Control Logs
```sql
SELECT * FROM access_control_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

#### Check System Status
1. Navigate to **Access Control** → **Overview**
2. Verify all statistics are correct
3. Run maintenance to ensure system health

### 6. Common Issues and Solutions

#### Issue: Student can't access despite approvals
**Solution**: Check both payment approval AND semester registration status
```sql
SELECT * FROM check_student_access('student-uuid-here');
```

#### Issue: Real-time updates not working
**Solution**: 
1. Check Supabase real-time is enabled
2. Verify WebSocket connections in browser dev tools
3. Check console for subscription errors

#### Issue: Access not being revoked automatically
**Solution**:
1. Run maintenance function manually
2. Check trigger functions are working
3. Verify auto_expire is set to true

### 7. Production Deployment

#### Environment Variables
Ensure these are set in your production environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

#### Database Permissions
Ensure proper RLS (Row Level Security) policies are in place:
```sql
-- Enable RLS on all access control tables
ALTER TABLE payment_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_semester_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_control_logs ENABLE ROW LEVEL SECURITY;
```

#### Scheduled Maintenance
Set up a cron job to run maintenance regularly:
```bash
# Run every hour
0 * * * * psql -d your_database -c "SELECT run_access_control_maintenance();"
```

### 8. Monitoring and Alerts

#### Key Metrics to Monitor
- Number of pending payment approvals
- Students with expired access
- Failed access attempts
- System maintenance results

#### Set Up Alerts
- Alert when pending approvals exceed threshold
- Alert when maintenance fails
- Alert for unusual access patterns

### 9. User Training

#### For Accounts Office Staff
1. Payment approval workflow
2. Semester management procedures
3. Access control monitoring
4. Emergency access procedures

#### For Students
1. How to check access status
2. What to do when access is denied
3. Contact information for support
4. Understanding access periods

### 10. Backup and Recovery

#### Regular Backups
Ensure these tables are included in backups:
- `payment_approvals`
- `semester_periods`
- `student_semester_registrations`
- `access_control_logs`

#### Recovery Procedures
Document procedures for:
- Restoring access during system failures
- Manual access override procedures
- Data recovery from backups

## Support and Maintenance

### Regular Tasks
- Weekly review of access control logs
- Monthly cleanup of old logs
- Quarterly review of access policies
- Annual system security audit

### Emergency Procedures
- Emergency access override
- System maintenance during outages
- Data recovery procedures
- Contact escalation procedures

## Success Criteria

The system is working correctly when:
✅ Students with valid payment and registration can access all modules
✅ Students without valid payment/registration are denied access
✅ Access is revoked automatically when conditions expire
✅ Real-time updates work within 2 minutes
✅ All access attempts are logged
✅ Accounts office can manage all aspects of access control
✅ Error messages are clear and actionable
✅ System performance is maintained under load
