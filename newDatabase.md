# Create a New Supabase Backend for This Project

This guide explains how to create a brand-new Supabase backend for this project from the beginning, even if you have never used Supabase before.

It is written specifically for this repository, not as a generic Supabase tutorial.

This project already contains:

- database migrations in `supabase/migrations/`
- Edge Functions in `supabase/functions/`
- a typed Supabase client in `src/integrations/supabase/`
- frontend code that expects specific tables, buckets, auth settings, and secrets

If you follow this guide completely, your new Supabase project will match what this app expects.

## What This Project Needs From Supabase

This app does not only need "a database". It needs all of the following:

1. A Supabase project
2. A PostgreSQL database with the correct tables and policies
3. Supabase Authentication configured for email/password login
4. An admin user in `auth.users`
5. Two private storage buckets:
   - `certificates`
   - `photos`
6. Three Edge Functions:
   - `verify-certificate-record`
   - `create-student-user`
   - `reset-student-password`
7. Project environment variables in the frontend
8. One custom shared secret for certificate hashing:
   - `UNIVERSITY_SALT`

If any one of these is missing, some part of the app will fail.

## Important Safety Note Before You Start

This repository currently contains code in `src/integrations/supabase/client.ts` that reads:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

Anything that starts with `VITE_` is exposed to the browser when the frontend is built.

That means:

- `VITE_SUPABASE_PUBLISHABLE_KEY` is fine
- `VITE_SUPABASE_SERVICE_ROLE_KEY` is **not safe** for production browser use

So:

- if you are only trying to get the current project running locally exactly as it is, this guide shows you what the current code expects
- if you plan to deploy this publicly, you should remove the browser-side use of the service-role key and move those privileged actions fully into Edge Functions or a backend server

I am including the current setup because your request was to document everything needed for this project as it exists now.

## Files In This Repository That Matter

These are the main files behind the Supabase backend:

- `supabase/config.toml`
- `supabase/migrations/20260308154841_ad860317-af9f-4763-b6d2-e4343d7df821.sql`
- `supabase/migrations/20260308155902_48b92349-5c71-4d24-a2de-c360934e64b9.sql`
- `supabase/migrations/20260316000000_v5_features.sql`
- `supabase/migrations/20260316000001_add_file_hashes.sql`
- `supabase/migrations/20260316000002_supabase_auth_migration.sql`
- `supabase/migrations/20260418012936_verification_backend_gate.sql`
- `supabase/migrations/20260418021500_student_owner_rls.sql`
- `supabase/functions/verify-certificate-record/index.ts`
- `supabase/functions/create-student-user/index.ts`
- `supabase/functions/reset-student-password/index.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/lib/database.ts`
- `src/lib/storage.ts`
- `src/lib/crypto.ts`

## What Will Be Created In Supabase

After setup, your Supabase project should contain:

### Tables

- `departments`
- `student_records`
- `app_users`

### View

- `app_users_public`

### SQL helper functions

- `public.current_app_role()`
- `public.is_admin()`

### Storage buckets

- `certificates` as a private bucket
- `photos` as a private bucket

### Auth behavior

- email/password login enabled
- email confirmation disabled for this workflow
- admin user manually created first
- student users later created by the app or Edge Function

## Prerequisites

Before you start, make sure you have:

1. A Supabase account
2. Access to this project locally
3. Node.js installed
4. `npm install` already run in this project
5. Terminal access in the project root

Optional but strongly recommended:

1. Supabase CLI access through `npx supabase`
2. A test wallet in MetaMask if you want to test blockchain registration

## Step 1: Create a New Supabase Project

1. Open `https://supabase.com`
2. Sign in
3. Click `New project`
4. Choose your organization
5. Enter a project name
6. Enter a strong database password
7. Choose a region
8. Click `Create new project`

Wait for the project to finish provisioning.

Do not close the browser while it is being created.

## Step 2: Collect the Values You Will Need

After the project is ready, open your Supabase dashboard and collect these values.

### 2.1 Project Reference

You will need the project reference for CLI commands.

You can find it:

- in the project URL
- or in project settings

It looks similar to:

```text
abcdxyzexampleproject
```

### 2.2 Project URL

Go to:

- `Project Settings`
- `API`

Copy the project URL.

It looks like:

```text
https://your-project-ref.supabase.co
```

### 2.3 Publishable Key

In the same `API` page, copy the **publishable key**.

This project uses the environment variable name:

```env
VITE_SUPABASE_PUBLISHABLE_KEY
```

### 2.4 Service Role Key

Also copy the **service_role** key from the same page.

You will need it for:

- Edge Functions
- privileged admin operations
- the current local frontend setup in this repository

Again: do **not** expose this publicly in a production frontend.

### 2.5 Database Password

Keep the database password you set during project creation.

You may need it when using:

- `npx supabase link`
- `npx supabase db push`

## Step 3: Log In To Supabase CLI

From the project root, run:

```bash
npx supabase login
```

This usually opens a browser or asks for a token.

When it finishes successfully, continue.

## Step 4: Link This Repository To Your New Supabase Project

Run:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your real project reference.

What this does:

- connects the local `supabase/` folder to your new remote Supabase project
- updates local project linkage
- allows `db push`, `functions deploy`, and `secrets set` to target the correct project

If asked for the database password, enter the password you chose when creating the project.

### Check `supabase/config.toml`

After linking, open `supabase/config.toml`.

The `project_id` should match your new Supabase project reference.

If it does not, fix the link before continuing.

## Step 5: Create the Frontend Environment File

This project already uses Vite environment variables.

Create or update a root environment file.

You can use:

- `.env`
- or `.env.local`

If you are unsure, use `.env.local` so the values stay machine-specific.

Add this:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
VITE_UNIVERSITY_SALT=CHOOSE_A_LONG_RANDOM_SECRET_VALUE

# Current codebase expects this for local admin password reset behavior.
# This is NOT safe for a public frontend deployment.
VITE_SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### What each variable does

`VITE_SUPABASE_URL`

- used by the frontend Supabase client

`VITE_SUPABASE_PUBLISHABLE_KEY`

- used by the frontend for normal Supabase access

`VITE_UNIVERSITY_SALT`

- used when generating the certificate hash in `src/lib/crypto.ts`
- must match the Edge Function secret `UNIVERSITY_SALT`
- if the values do not match, verification will fail

`VITE_SUPABASE_SERVICE_ROLE_KEY`

- currently used by `src/integrations/supabase/client.ts`
- gives admin-level access
- should only be used locally until the code is refactored

## Step 6: Push the Database Migrations

This is the easiest and safest way to create the correct schema because the repository already contains the SQL.

Run:

```bash
export SUPABASE_DB_PASSWORD=your_database_password
npx supabase db push
```

This applies the SQL files in `supabase/migrations/` to your new project in order.

### What these migrations do

`20260308154841_ad860317-af9f-4763-b6d2-e4343d7df821.sql`

- creates `departments`
- creates `student_records`
- creates `app_users`
- creates `app_users_public`
- seeds default departments
- seeds an old admin record in `app_users`

`20260308155902_48b92349-5c71-4d24-a2de-c360934e64b9.sql`

- adds extra policies for departments, student records, and app users

`20260316000000_v5_features.sql`

- adds:
  - `cgpa`
  - `certificate_file_path`
  - `photo_path`

`20260316000001_add_file_hashes.sql`

- adds:
  - `certificate_file_hash`
  - `photo_hash`

`20260316000002_supabase_auth_migration.sql`

- introduces Supabase Auth-based role helpers
- creates private storage buckets
- adds authenticated/admin-based RLS policies

`20260418012936_verification_backend_gate.sql`

- removes direct anonymous reads for verification
- makes the Edge Function the controlled path for record verification

`20260418021500_student_owner_rls.sql`

- backfills and enforces `supabase_user_id`
- ensures each student record is linked to a real auth user
- tightens owner-scoped row-level security

### If `db push` fails

Do not skip the error.

Read the exact message carefully.

Common causes:

1. The project is not linked correctly
2. The database password entered was wrong
3. The new project already has conflicting objects
4. A migration expects auth users to exist and they do not yet

If needed, start over with a completely fresh Supabase project rather than trying to patch a half-broken setup.

## Step 7: Understand the Final Database Shape

You do not need to create these manually if `db push` succeeded, but you should know what the app expects.

### `departments`

Stores department names shown in the admin UI.

Important columns:

- `id`
- `name`
- `created_at`

### `app_users`

Stores app-side user index data.

Important columns:

- `id`
- `supabase_user_id`
- `username`
- `password_hash`
- `role`
- `name`
- `roll_number`
- `created_at`

Important note:

- the real login now happens through Supabase Auth
- `app_users` is mainly used as an app reference/index table

### `student_records`

Stores certificate and student record data.

Important columns:

- `id`
- `supabase_user_id`
- `student_name`
- `roll_number`
- `department`
- `academic_year`
- `date_of_joining`
- `date_of_completion`
- `total_marks`
- `cgpa`
- `certificate_file_path`
- `photo_path`
- `certificate_file_hash`
- `photo_hash`
- `certificate_hash`
- `blockchain_tx_hash`
- `qr_code_data`
- `status`
- `created_at`

## Step 8: Configure Authentication Correctly

This step is required.

The app expects email/password auth.

Go to the Supabase dashboard:

1. Open `Authentication`
2. Open `Providers`
3. Open the `Email` provider
4. Make sure email/password sign-in is enabled
5. Disable email confirmation for this workflow

Why email confirmation is disabled here:

- the app creates students as internal users
- student email addresses are generated in the format `rollnumber@blockcert.edu`
- those are acting as login identifiers, not real inboxes
- if email confirmation stays enabled, those accounts may not be usable

## Step 9: Create the First Admin User

This project needs a real admin account in `auth.users` before you can use the admin dashboard properly.

### 9.1 Create the admin user in the dashboard

Go to:

1. `Authentication`
2. `Users`
3. Click `Add user`

Enter:

- email: something like `admin@admin.com`
- password: choose your admin password
- auto confirm: enabled

Create the user.

### 9.2 Add admin metadata

After creating the admin user, open the SQL Editor in Supabase and run this:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'admin',
  'name', 'University Admin'
)
WHERE email = 'admin@admin.com';
```

If you used a different admin email, replace `admin@admin.com` with your real value.

### Why this metadata matters

The SQL helper function `public.current_app_role()` checks the JWT metadata for the user role.

If the admin user does not have:

- `"role": "admin"`

then the admin user will not pass the RLS checks for admin-only actions.

## Step 10: Confirm Storage Buckets Exist

If `npx supabase db push` succeeded, the buckets should already exist because the migration creates them.

Still, verify them manually:

1. Open `Storage`
2. You should see:
   - `certificates`
   - `photos`
3. Both should be private, not public

### What these buckets are used for

`certificates`

- stores uploaded certificate files

`photos`

- stores uploaded student photos

The frontend uploads to these through `src/lib/storage.ts`.

## Step 11: Set Edge Function Secrets

This project has one custom secret that must be set manually in Supabase Edge Functions:

- `UNIVERSITY_SALT`

Run:

```bash
npx supabase secrets set UNIVERSITY_SALT=CHOOSE_THE_SAME_VALUE_AS_VITE_UNIVERSITY_SALT
```

If your project is not already linked, include the project ref:

```bash
npx supabase secrets set UNIVERSITY_SALT=CHOOSE_THE_SAME_VALUE_AS_VITE_UNIVERSITY_SALT --project-ref YOUR_PROJECT_REF
```

### Very important

The value of:

- frontend `VITE_UNIVERSITY_SALT`
- Edge Function secret `UNIVERSITY_SALT`

must be exactly the same.

If they are different:

- the app will store one hash during certificate creation
- the verification function will recompute a different hash later
- valid certificates will look tampered or missing

## Step 12: Deploy the Edge Functions

This repository contains three Supabase Edge Functions.

Deploy all of them.

### 12.1 Deploy `verify-certificate-record`

```bash
npx supabase functions deploy verify-certificate-record
```

### 12.2 Deploy `create-student-user`

```bash
npx supabase functions deploy create-student-user
```

### 12.3 Deploy `reset-student-password`

```bash
npx supabase functions deploy reset-student-password
```

If your local project is not linked, add:

```bash
--project-ref YOUR_PROJECT_REF
```

to each command.

### What each function does

`verify-certificate-record`

- verifies the hash against the blockchain
- reads the matching record from `student_records`
- recomputes the salted hash
- detects tampering
- creates signed URLs for private files in storage
- returns certificate data only after backend-controlled verification

`create-student-user`

- creates a student auth user using admin privileges
- sets metadata such as:
  - `name`
  - `role`
  - `roll_number`

`reset-student-password`

- resets a student's password using admin privileges

## Step 13: Keep The Blockchain Values In Sync

This project is not only a Supabase app. It also verifies certificate hashes against a blockchain contract on Sepolia.

Two values must stay consistent with the blockchain side.

### 13.1 Contract address

The contract address is hard-coded in two places:

- `src/lib/ethereum.ts`
- `supabase/functions/verify-certificate-record/index.ts`

Right now both files use:

```text
0xe5a4063430c194CAe363C0f5554d3B7028609EDd
```

If you deploy a different smart contract, update both places.

Then redeploy the `verify-certificate-record` Edge Function.

### 13.2 Hash salt

The hashing logic exists in:

- `src/lib/crypto.ts`
- `supabase/functions/verify-certificate-record/index.ts`

The values must match:

- the algorithm
- the field order
- the salt

Do not change the hash format in only one place.

## Step 14: Regenerate TypeScript Database Types

If the new backend is supposed to exactly match the current schema, the existing `src/integrations/supabase/types.ts` may already be usable.

But the recommended approach after creating a new backend is to regenerate the types from the new project.

Run:

```bash
npx supabase gen types typescript --schema public > src/integrations/supabase/types.ts
```

Or, if needed:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > src/integrations/supabase/types.ts
```

Do this whenever the remote schema changes.

## Step 15: Start The App Against The New Backend

Run:

```bash
npm run dev
```

Then open the app in the browser.

## Step 16: Test The New Backend Properly

Do not stop after the page loads. Test the important flows.

### 16.1 Test admin login

1. Open the login page
2. Sign in with the admin user you created
3. Confirm you can reach the admin dashboard

If login works but admin actions fail, the usual cause is missing admin metadata.

### 16.2 Test departments

1. Add a department
2. Refresh
3. Confirm it still exists

This proves:

- the database table exists
- the insert policy works
- the admin token is recognized correctly

### 16.3 Test student creation

Use the student creation flow from the admin dashboard.

This should create:

- a new user in `auth.users`
- a matching row in `app_users`

Expected student email format:

```text
rollnumber@blockcert.edu
```

That is normal in this project.

### 16.4 Test record creation

Create a certificate record with:

- student data
- photo upload
- certificate upload

This should:

1. upload files to storage
2. compute file hashes
3. compute the master certificate hash
4. register the hash on-chain
5. create or reuse the student auth account
6. insert the row into `student_records`

### 16.5 Test student login

Log in as a student account that was created by the app.

Confirm the student can only see their own data.

This proves the owner-scoped RLS is working.

### 16.6 Test verification page

Open the verification page and verify a record by hash or QR code.

This should:

1. call the `verify-certificate-record` Edge Function
2. confirm the hash exists on-chain
3. fetch the correct record off-chain
4. recompute the salted hash
5. generate signed URLs for private files
6. return the verified result

## Step 17: What To Check In Supabase Dashboard After Setup

After everything is done, open the dashboard and confirm the following.

### Database

- `departments` table exists
- `student_records` table exists
- `app_users` table exists
- `app_users_public` view exists

### Authentication

- email provider enabled
- confirm email disabled for this workflow
- admin user exists
- student users appear after creation

### Storage

- `certificates` bucket exists
- `photos` bucket exists
- both are private

### Edge Functions

- `verify-certificate-record` deployed
- `create-student-user` deployed
- `reset-student-password` deployed

### Secrets

- `UNIVERSITY_SALT` exists

## Step 18: Manual Setup Fallback If CLI Push Does Not Work

The preferred method is still:

```bash
npx supabase db push
```

But if you absolutely need to do it manually, run the migration files in the SQL Editor in this exact order:

1. `supabase/migrations/20260308154841_ad860317-af9f-4763-b6d2-e4343d7df821.sql`
2. `supabase/migrations/20260308155902_48b92349-5c71-4d24-a2de-c360934e64b9.sql`
3. `supabase/migrations/20260316000000_v5_features.sql`
4. `supabase/migrations/20260316000001_add_file_hashes.sql`
5. `supabase/migrations/20260316000002_supabase_auth_migration.sql`
6. `supabase/migrations/20260418012936_verification_backend_gate.sql`
7. `supabase/migrations/20260418021500_student_owner_rls.sql`

If you use this manual route:

- run one file at a time
- wait for each one to finish
- do not change the order
- stop immediately if one fails

## Common Mistakes And Their Fixes

### Problem: login works, but admin actions fail

Cause:

- admin metadata is missing or wrong

Fix:

- update `auth.users.raw_user_meta_data` so it includes `"role": "admin"`

### Problem: certificate verification says tampered or missing for valid data

Cause:

- `VITE_UNIVERSITY_SALT` and `UNIVERSITY_SALT` do not match
- or contract address differs between frontend and Edge Function

Fix:

- make the salt identical in both places
- make the contract address identical in both places
- redeploy the Edge Function after changing it

### Problem: storage upload fails

Cause:

- buckets do not exist
- buckets are public/misconfigured
- RLS policies were not created
- admin role is not recognized

Fix:

- confirm migrations ran successfully
- confirm bucket names are exactly `certificates` and `photos`
- confirm the logged-in user is truly an admin

### Problem: student cannot see their record

Cause:

- `student_records.supabase_user_id` is missing or wrong
- `app_users.supabase_user_id` is missing or wrong
- the student account metadata is wrong

Fix:

- confirm the student auth user exists
- confirm the student record links to the same auth user id
- confirm the student was created through the app flow or correct admin process

### Problem: frontend connects to the wrong Supabase project

Cause:

- old `.env` values

Fix:

- update the environment file
- stop the dev server
- start it again

## Recommended Final Checklist

Before you say the backend setup is complete, confirm all of these:

- new Supabase project created
- project linked locally with CLI
- environment file updated
- migrations pushed successfully
- email/password auth enabled
- email confirmation disabled for this workflow
- admin user created in `auth.users`
- admin metadata includes `role=admin`
- `certificates` bucket exists and is private
- `photos` bucket exists and is private
- `UNIVERSITY_SALT` secret set in Supabase
- all three Edge Functions deployed
- frontend and Edge Function use the same salt
- frontend and Edge Function use the same contract address
- admin login works
- student creation works
- record creation works
- verification works

## Short Version

If you already understand the full guide and only want the command flow, it is:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase secrets set UNIVERSITY_SALT=YOUR_EXACT_SALT
npx supabase functions deploy verify-certificate-record
npx supabase functions deploy create-student-user
npx supabase functions deploy reset-student-password
npx supabase gen types typescript --schema public > src/integrations/supabase/types.ts
npm run dev
```

But do not use this short version unless you also completed the manual dashboard steps for:

- auth configuration
- admin user creation
- admin metadata
- frontend environment variables

## Final Warning

For local development, this guide matches the current repository.

For production deployment, the current browser-side use of `VITE_SUPABASE_SERVICE_ROLE_KEY` should be removed before going live.

The safer production design is:

- browser uses only publishable key
- privileged operations happen only in Edge Functions or a secure backend
- service-role key never reaches browser code
