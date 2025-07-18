# Database Schema Setup

This directory contains the database schema files for the Staff Management System, Application File Upload features, and Financial Management System.

## Files

- `staff_management_schema.sql` - Complete database schema for staff management and application file uploads
- `financial_schema.sql` - Complete database schema for financial records and payment management

## Setup Instructions

### 1. Supabase Dashboard Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `staff_management_schema.sql`
4. Execute the SQL script

### 2. Storage Buckets

The schema automatically creates the following storage buckets:
- `applications` - For storing application files (NRC photos, Grade 12 results, payment receipts)
- `staff-photos` - For storing staff profile photos

### 3. Tables Created

#### Staff Management Tables:
- **staff** - Main staff directory table
- **staff_audit_logs** - Audit trail for all staff operations
- **staff_departments** - Reference table for departments
- **staff_job_titles** - Reference table for job titles

#### Application File Tables:
- **application_files** - Metadata for uploaded application files

### 4. Security Features

#### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

- **Admin users** can perform all CRUD operations
- **Public users** can view active staff (for staff directory)
- **Application users** can view their own uploaded files

#### Storage Policies
- Application files are private (admin access only)
- Staff photos are publicly viewable but admin-managed

### 5. Indexes

Performance indexes are created for:
- Staff searches by department, job title, active status
- Audit log queries by staff, action, timestamp
- Application file queries by application, type, review status

### 6. Triggers

Automatic `updated_at` timestamp triggers for:
- staff table
- application_files table

### 7. Sample Data

The schema includes sample departments and job titles:

**Departments:**
- Nursing
- Administration  
- Academic
- Clinical
- Support
- Management

**Job Titles:**
- Principal
- Vice Principal
- Senior Lecturer
- Lecturer
- Clinical Instructor
- Registrar
- Librarian
- IT Support
- Administrative Assistant
- Accountant
- Security Officer
- Maintenance Staff

## Usage Notes

### Staff Management
- All staff operations are logged in the audit table
- Staff can be activated/deactivated instead of deleted
- Profile photos are stored in the staff-photos bucket
- Search and filtering capabilities built into the schema

### Application Files
- Files are validated client-side with authenticity scoring
- Files with low authenticity scores are flagged for review
- Metadata includes file size, type, and validation results
- Admin review workflow supported

### Authentication
- Assumes Supabase Auth with user roles in `raw_user_meta_data`
- Admin role required for staff management operations
- Public access for viewing active staff directory

## Maintenance

### Regular Tasks
1. Monitor audit logs for unusual activity
2. Review flagged application files
3. Clean up old application files if needed
4. Update department/job title reference data as needed

### Backup Considerations
- Include all tables in regular backups
- Storage buckets should be backed up separately
- Consider archiving old audit logs periodically

## Troubleshooting

### Common Issues
1. **RLS Policy Errors**: Ensure user has correct role in metadata
2. **Storage Upload Errors**: Check bucket policies and authentication
3. **Trigger Errors**: Verify trigger function exists and is accessible

### Debugging Queries
```sql
-- Check user role
SELECT auth.jwt()->>'email', auth.uid();
SELECT raw_user_meta_data FROM auth.users WHERE id = auth.uid();

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'staff';

-- Check storage policies  
SELECT * FROM storage.policies WHERE bucket_id IN ('applications', 'staff-photos');
```

## Migration Notes

If updating an existing system:
1. Backup existing data
2. Run schema updates incrementally
3. Test RLS policies thoroughly
4. Verify storage bucket configurations
5. Update application code to use new APIs

## Security Considerations

1. **File Upload Validation**: Client-side validation is supplemented by server-side checks
2. **Authenticity Scoring**: Implement proper validation algorithms for document verification
3. **Access Control**: Regularly audit user roles and permissions
4. **Data Privacy**: Ensure compliance with data protection regulations
5. **Audit Trail**: Maintain comprehensive logs for compliance and security monitoring
