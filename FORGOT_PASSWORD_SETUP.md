# Forgot Password Setup Guide

## Environment Variables Required

Make sure you have the following environment variables set in your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site URL (for password reset redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## How It Works

### 1. API Route (`/api/forgot-password`)
- Accepts POST requests with email
- Checks if email exists in `profiles` table
- Verifies that `is_verified = true`
- Only sends password reset email to verified accounts
- Returns generic success message for security (doesn't reveal if account exists)

### 2. Frontend Pages
- **`/auth/forgot-password`**: Form to enter email address
- **`/auth/update-password`**: Page to set new password after clicking email link

### 3. Security Features
- Only verified users can reset passwords
- Generic error messages (doesn't expose account existence)
- Password validation with requirements
- Secure password update using Supabase Auth

## Testing

1. **Test with verified account**:
   - Enter email of verified user
   - Should receive success message
   - Check email for reset link

2. **Test with unverified account**:
   - Enter email of unverified user
   - Should receive same success message (security)
   - No email should be sent

3. **Test with non-existent email**:
   - Enter random email
   - Should receive same success message (security)
   - No email should be sent

## Flow

1. User clicks "Forgot password?" on login page
2. User enters email on `/auth/forgot-password`
3. API checks if email exists and is verified
4. If verified, sends password reset email
5. User clicks link in email
6. User sets new password on `/auth/update-password`
7. User is redirected to login page

## Notes

- The system only allows password resets for verified accounts (`is_verified = true`)
- Error messages are generic for security reasons
- Password reset links expire according to Supabase settings
- The redirect URL in the email points to `/auth/update-password` 