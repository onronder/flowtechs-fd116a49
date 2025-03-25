# Deployment Guide for Schema Security Enhancements

This document provides instructions for deploying the schema security enhancements to your Supabase project.

## Changes Made

The following files were modified to implement schema security enhancements:

1. Database Schema Changes (`supabase/functions/sql_init.sql`)
   - Added role-based access control tables and policies
   - Added security metadata columns to schema tables
   - Added audit logging for schema access

2. Edge Function Changes
   - Enhanced `Cust_FetchSchema` with security features
   - Added sensitivity detection and redaction

3. Frontend API Changes
   - Updated schema API interfaces to handle security features
   - Added permission checking functions

## Deployment Steps

### 1. Deploy SQL Changes

The SQL changes need to be applied to the Supabase database. You can do this in two ways:

#### Option A: Using the Supabase Dashboard SQL Editor
1. Log in to the Supabase Dashboard
2. Navigate to your project
3. Go to the SQL Editor tab
4. Open the `sql_init.sql` file from `supabase/functions/sql_init.sql`
5. Copy all the SQL statements from the file
6. Paste them into the SQL Editor
7. Execute the SQL statements

#### Option B: Using the Supabase CLI
1. Ensure Docker Desktop is running
2. Open a terminal
3. Navigate to the project directory
4. Run:
```bash
supabase db reset
```
This will apply all SQL migrations, including the schema changes.

### 2. Deploy Edge Functions

Deploy the Edge Functions using the Supabase CLI:

```bash
# Make sure Docker Desktop is running
# Navigate to the project directory
cd /path/to/flowtechs-fd116a49

# Link the project if not already linked
supabase link --project-ref sxzgeevxciuxjyxfartx

# Deploy the functions
supabase functions deploy Cust_FetchSchema
supabase functions deploy Cust_ValidateQuery
```

### 3. Verify Deployment

After deployment, verify that the changes are working correctly:

1. Check that the new tables are created in the database:
   - `user_roles`
   - `schema_access_logs`
   - Updated `source_schemas` with security columns

2. Test schema fetching with different user roles:
   - Admin user should see all schema data
   - Regular users should see redacted sensitive information

3. Verify that schema access is being logged in the `schema_access_logs` table

## Troubleshooting

If you encounter any issues during deployment:

1. Check the Supabase Function logs in the Dashboard for any errors
2. Ensure all SQL statements executed successfully
3. Verify that your Supabase project has the correct environment variables set
4. Check that your security policies are correctly configured

## Rollback Plan

In case of issues, you can roll back the changes:

1. Restore database from a backup (if available)
2. Deploy the previous versions of the Edge Functions:
```bash
supabase functions deploy --project-ref sxzgeevxciuxjyxfartx --file=/path/to/backup/Cust_FetchSchema.ts Cust_FetchSchema
```
3. Revert the frontend API code changes if deployed

## Post-Deployment Tasks

After successful deployment:

1. Add initial admin user roles:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin');
```

2. Set appropriate access levels for existing schemas:
```sql
UPDATE source_schemas 
SET access_level = 'shared', 
    is_sensitive = false,
    owner_id = 'DEFAULT_OWNER_ID',
    created_by = 'DEFAULT_OWNER_ID'
WHERE owner_id IS NULL;
```

3. Configure any additional security policies as needed