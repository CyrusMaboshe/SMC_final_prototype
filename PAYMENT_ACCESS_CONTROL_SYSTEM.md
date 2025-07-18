# Payment-Based Access and Semester Registration Control System

## Overview

This document describes the comprehensive payment-based access control system that has been implemented for the Sancta Maria Portal. The system enforces conditional access based on two core parameters: **account payment approval** and **semester registration status**, both strictly managed by the Accounts Office.

## System Architecture

### Core Components

1. **Database Schema** (`database/access_control_schema.sql`)
   - `payment_approvals` - Manages payment approvals with access periods
   - `semester_periods` - Defines and manages semester periods
   - `student_semester_registrations` - Tracks student semester registrations
   - `access_control_logs` - Comprehensive audit trail

2. **API Functions** (`src/lib/supabase.ts`)
   - Payment approval management
   - Semester period management
   - Access control validation
   - Real-time data synchronization

3. **Access Control Hooks** (`src/hooks/useAccessControl.ts`)
   - Real-time access monitoring
   - Automatic access validation
   - Module-level access control

4. **UI Components**
   - `AccessDenied` - Full-screen access denial interface
   - `AccessControlAlert` - Warning and status alerts
   - `AccessControlStatus` - Comprehensive status display
   - `PaymentApprovalManager` - Accounts office payment management
   - `SemesterRegistrationManager` - Semester management interface

## Access Control Logic

### Dual Validation System

Students must satisfy **BOTH** conditions to access the portal:

1. **Payment Approval**: 
   - Payment must be approved by Accounts Office
   - Access period must be valid (within valid from/until dates)
   - Payment status must be 'approved' (not pending, rejected, or expired)

2. **Semester Registration**:
   - Student must be registered for the currently active semester
   - Registration must be approved by Accounts Office
   - Semester must be active and within the semester period

### Access Validation Flow

```
Student Login Attempt
        ↓
Check Payment Approval
        ↓
Check Semester Registration
        ↓
Both Valid? → Grant Access
        ↓
Either Invalid? → Deny Access with Specific Message
```

## Error Messages

The system provides specific error messages based on the validation failure:

- **Both Failed**: "Access denied: You must pay and be approved by the Accounts Office to access your account and results."
- **Payment Only**: "Access denied: You must pay and be approved by the Accounts Office to access your account and results."
- **Registration Only**: "You are not registered for the current semester. Please visit the Accounts Office."

## Accounts Office Management

### Payment Approval Process

1. **Create Payment Approval**:
   - Select student
   - Enter payment amount and reference
   - Set payment date
   - Define access period (valid from/until dates)
   - Add approval notes
   - Approve payment

2. **Access Period Management**:
   - Set custom access periods for each payment
   - Automatic expiration when period ends
   - Manual revocation capabilities

### Semester Management

1. **Create Semester Periods**:
   - Define semester name and academic year
   - Set semester start and end dates
   - Configure registration periods
   - Activate/deactivate semesters

2. **Registration Management**:
   - Approve student registrations for active semester
   - Link registrations to payment approvals
   - Bulk registration operations

## Real-Time Features

### Automatic Access Revocation

- **Payment Expiration**: Access automatically revoked when payment period expires
- **Semester End**: Access restricted when semester period ends
- **Status Changes**: Real-time updates when approval status changes

### Real-Time Monitoring

- **WebSocket Subscriptions**: Instant updates via Supabase real-time
- **Periodic Checks**: Background validation every 2 minutes
- **Event Logging**: Comprehensive audit trail of all access events

## Student Experience

### Access Granted State

- Full portal access with all modules available
- Green status indicators throughout the interface
- Access period and semester end date displayed
- Warning alerts for upcoming expirations

### Access Denied State

- Custom access denied page with clear instructions
- Status breakdown showing payment and registration status
- Step-by-step guidance for resolving access issues
- Contact information for Accounts Office

### Limited Access State

- Partial access with restricted modules
- Warning banners indicating access limitations
- Module-specific access control messages
- Floating status widgets for awareness

## Module-Level Access Control

### Restricted Modules (Require Full Access)

- **Results**: CA Results, Exam Results, Quiz Results, Assignment Results
- **Courses**: Enrolled Courses, Attempt Quizzes, Submit Assignments
- **Timetable**: Exam Slips, Academic Calendar

### Accessible Modules (Basic Access)

- **Personal Information**: Always accessible
- **Financial Statements**: Requires payment approval only
- **Change Password**: Always accessible

## Security Features

### Access Control Validation

- Server-side validation for all access checks
- Database-level constraints and triggers
- Automatic expiration handling
- Comprehensive audit logging

### Data Isolation

- Students can only access their own data
- Accountants have full management capabilities
- Role-based access control throughout system
- Secure API endpoints with proper authentication

## Maintenance and Monitoring

### Automated Maintenance

- **Auto-Expiration**: Automatic payment approval expiration
- **Status Updates**: Real-time status synchronization
- **Cleanup Tasks**: Periodic maintenance operations

### Audit and Logging

- **Access Attempts**: All login attempts logged
- **Status Changes**: Payment and registration changes tracked
- **Administrative Actions**: All accountant actions audited
- **System Events**: Automatic expiration and revocation events

## Configuration Options

### Default Settings

- Payment approval validity periods
- Semester registration periods
- Access warning thresholds (7 days before expiration)
- Automatic expiration settings

### Customizable Policies

- Access period lengths
- Warning message timing
- Module access restrictions
- Expiration handling behavior

## Implementation Status

✅ **Completed Features**:
- Database schema and functions
- Payment approval management
- Semester registration management
- Access control middleware
- Student dashboard integration
- Real-time monitoring
- Alert and warning system
- Accounts office interface
- Automatic access revocation
- Comprehensive audit logging

## Usage Instructions

### For Accounts Office Staff

1. **Approve Payments**:
   - Navigate to Access Control → Payment Approvals
   - Click "Approve New Payment"
   - Fill in payment details and access period
   - Submit approval

2. **Manage Semesters**:
   - Navigate to Access Control → Semester Management
   - Create new semester periods
   - Activate current semester
   - Open/close registration periods

3. **Monitor Access**:
   - View dashboard statistics
   - Check access control logs
   - Run maintenance operations

### For Students

1. **Check Access Status**:
   - Access status displayed in dashboard header
   - Detailed status in access control alerts
   - Module-specific access indicators

2. **Resolve Access Issues**:
   - Follow instructions on access denied page
   - Contact Accounts Office for assistance
   - Verify payment and registration status

## Technical Requirements

- Next.js 15.3.4+
- Supabase with real-time subscriptions
- PostgreSQL with custom functions
- TypeScript for type safety
- Tailwind CSS for styling

## Future Enhancements

- Mobile app integration
- SMS/Email notifications for access changes
- Bulk payment approval operations
- Advanced reporting and analytics
- Integration with external payment systems
