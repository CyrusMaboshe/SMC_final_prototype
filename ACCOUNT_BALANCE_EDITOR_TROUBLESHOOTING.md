# Account Balance Editor Troubleshooting Guide

## Overview
This guide helps troubleshoot issues with the Account Balance Editor functionality in the double ledger system.

## Common Issues and Solutions

### 1. "Failed to apply balance adjustment: undefined"

**Cause**: The `ledger_adjustments` table doesn't exist in the database.

**Solution**:
1. Run the SQL file `create_ledger_adjustments_table.sql` in your Supabase SQL editor
2. Or use the "Test Table Creation" button in the test interface
3. Verify the table exists by checking in Supabase dashboard

### 2. Permission Denied Errors

**Cause**: Row Level Security (RLS) policies are blocking access.

**Solution**:
1. Check RLS policies on the `ledger_adjustments` table
2. Ensure authenticated users have proper permissions
3. Run this SQL to grant permissions:
```sql
GRANT SELECT, INSERT, UPDATE ON ledger_adjustments TO authenticated;
```

### 3. Foreign Key Constraint Errors

**Cause**: The `student_id` doesn't exist in the `students` table.

**Solution**:
1. Verify the student exists in the database
2. Check that the student ID is a valid UUID
3. Ensure the student hasn't been deleted

### 4. Check Constraint Violations

**Cause**: Both debit and credit amounts are provided, or both are zero.

**Solution**:
1. Ensure only one of debit_amount OR credit_amount is greater than 0
2. The other must be 0
3. At least one must be greater than 0

### 5. Real-time Updates Not Working

**Cause**: Supabase real-time subscriptions not properly configured.

**Solution**:
1. Check that real-time is enabled in Supabase project settings
2. Verify the subscription is properly set up in the component
3. Check browser console for subscription errors

## Testing Steps

### 1. Database Setup Test
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'ledger_adjustments';

-- Check table structure
\d ledger_adjustments;

-- Test insert (replace with actual student ID)
INSERT INTO ledger_adjustments (
    student_id,
    description,
    reference_number,
    debit_amount,
    type,
    created_by
) VALUES (
    'your-student-uuid-here',
    'Test adjustment',
    'TEST-001',
    100.00,
    'adjustment',
    'test-accountant'
);
```

### 2. API Test
Use the test file `test-account-balance-editor.html`:
1. Enter Supabase URL and key
2. Click "Initialize Connection"
3. Click "Test Table Creation"
4. Load students and select one
5. Try applying a balance adjustment

### 3. Component Test
1. Login as an accountant
2. Navigate to "Account Balance Editor" tab
3. Search and select a student
4. Load student balances
5. Apply a test adjustment

## Required Database Tables

The Account Balance Editor requires these tables:
- `students` (must exist with proper student records)
- `ledger_adjustments` (created by this feature)
- `financial_records` (for calculating current balances)
- `payments` (for calculating current balances)

## Required Permissions

Ensure these permissions are granted:
```sql
-- For ledger_adjustments table
GRANT SELECT, INSERT, UPDATE ON ledger_adjustments TO authenticated;

-- For related tables
GRANT SELECT ON students TO authenticated;
GRANT SELECT ON financial_records TO authenticated;
GRANT SELECT ON payments TO authenticated;
```

## Environment Variables

Ensure these are properly configured:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Debugging Tips

1. **Check Browser Console**: Look for JavaScript errors and network requests
2. **Check Supabase Logs**: Monitor real-time logs in Supabase dashboard
3. **Verify Data**: Ensure test data exists (students, financial records)
4. **Test Permissions**: Try operations directly in Supabase SQL editor
5. **Check Network**: Ensure stable internet connection for real-time features

## Error Messages and Meanings

- `"undefined"`: Usually indicates table doesn't exist or permission denied
- `"relation does not exist"`: Table hasn't been created
- `"permission denied"`: RLS policy blocking access
- `"foreign key violation"`: Referenced student doesn't exist
- `"check constraint violation"`: Invalid debit/credit combination

## Support

If issues persist:
1. Check all tables exist and have proper structure
2. Verify RLS policies allow authenticated access
3. Ensure test data is available
4. Check Supabase project configuration
5. Review browser console and network tabs for detailed errors

## Files Involved

- `src/components/AccountBalanceEditor.tsx` - Main component
- `src/lib/supabase.ts` - API functions
- `src/hooks/useRealTimeUpdates.ts` - Real-time subscriptions
- `test-account-balance-editor.html` - Testing interface
- `create_ledger_adjustments_table.sql` - Table creation script
