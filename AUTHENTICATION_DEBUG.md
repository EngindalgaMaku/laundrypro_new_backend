# Authentication Issues Debug Guide

## Problem Summary
The application was experiencing authentication failures with errors:
- `User not found` errors in `/api/users/me`
- `Business not found` errors in `/api/business/me`
- JWT tokens containing invalid user IDs

## Root Cause Analysis
The issue appears to be related to:
1. **Stale JWT tokens** containing user IDs that no longer exist in the database
2. **Database connection issues** causing user lookup failures
3. **Missing error handling** for token validation edge cases

## Solutions Implemented

### 1. Enhanced Authentication Validation (`lib/auth-utils.ts`)
- Created comprehensive auth validation that checks:
  - JWT token validity
  - User exists in database
  - User is active
  - Business exists and is active (if applicable)
- Provides detailed error messages for debugging

### 2. Improved API Endpoints
Updated the following endpoints with better error handling:
- `/api/users/me/route.ts` - Now uses enhanced validation
- `/api/business/me/route.ts` - Now uses enhanced validation
- Added detailed logging for debugging

### 3. Token Refresh Mechanism
- Created `/api/auth/refresh/route.ts` for token renewal
- Enhanced `lib/api-client.ts` with automatic token refresh
- Handles expired tokens gracefully

### 4. Debug Endpoints
Created debug endpoints to help diagnose issues:
- `/api/debug/auth` - Authentication debugging
- `/api/debug/db` - Database connection testing

### 5. Enhanced Login Process
- Improved `/api/auth/login/route.ts` with better logging
- Ensures proper JWT payload structure
- Validates environment configuration

## Debugging Steps

### Step 1: Check Database Connection
```bash
# Test database connectivity
curl http://localhost:3000/api/debug/db
```

This will show:
- Database connection status
- User count in database
- Sample user IDs
- Environment configuration

### Step 2: Check Authentication Status
```bash
# Test current authentication (replace TOKEN with actual token)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/debug/auth
```

This will show:
- Token payload details
- User lookup results
- Business lookup results
- Available users in database

### Step 3: Test Token Refresh
```bash
# Attempt token refresh (replace TOKEN with actual token)
curl -X POST -H "Authorization: Bearer TOKEN" http://localhost:3000/api/auth/refresh
```

### Step 4: Check Server Logs
Look for these log patterns:
- `[DEBUG]` - Detailed debugging information
- `[AUTH]` - Authentication validation logs
- `[LOGIN]` - Login process logs
- `[REFRESH]` - Token refresh logs

## Common Issues and Solutions

### Issue 1: "User not found" Error
**Cause**: JWT token contains a user ID that doesn't exist in database
**Solution**: 
1. Check if user was deleted from database
2. Use token refresh endpoint to get new token
3. If refresh fails, user needs to log in again

### Issue 2: "Business not found" Error
**Cause**: JWT token contains a business ID that doesn't exist
**Solution**:
1. Check if business was deleted or deactivated
2. Update user's businessId in database
3. User may need to log in again

### Issue 3: Database Connection Errors
**Cause**: Database is unreachable or credentials are invalid
**Solution**:
1. Check `DATABASE_URL` environment variable
2. Verify database server is running
3. Check network connectivity

### Issue 4: JWT Verification Errors
**Cause**: `NEXTAUTH_SECRET` is missing or changed
**Solution**:
1. Ensure `NEXTAUTH_SECRET` is set in environment
2. If secret changed, all existing tokens are invalid
3. Users need to log in again

## Environment Variables Required
```env
DATABASE_URL="mysql://user:password@host:port/database"
NEXTAUTH_SECRET="your-secret-key-here"
```

## Testing the Fixes

### 1. Fresh Login Test
```bash
# Test login with valid credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. API Access Test
```bash
# Test accessing protected endpoint
curl -H "Authorization: Bearer NEW_TOKEN" http://localhost:3000/api/users/me
```

### 3. Token Refresh Test
```bash
# Test token refresh
curl -X POST -H "Authorization: Bearer TOKEN" http://localhost:3000/api/auth/refresh
```

## Monitoring and Prevention

### 1. Add Health Checks
The debug endpoints can be used for health monitoring:
- Monitor `/api/debug/db` for database health
- Set up alerts for authentication failures

### 2. Token Expiration Monitoring
- Tokens expire after 7 days
- Client should automatically refresh tokens before expiration
- Monitor refresh endpoint usage

### 3. Database Integrity
- Ensure user and business records are not deleted without proper cleanup
- Consider soft deletes for important records
- Regular database backups

## Client-Side Integration

The enhanced `ApiClient` now automatically handles:
- Token refresh on 401 errors
- Automatic retry of failed requests
- Proper error handling and user feedback

Example usage:
```typescript
import { apiClient } from '@/lib/api-client';

// This will automatically handle token refresh if needed
const userData = await apiClient.get('/users/me');
```

## Next Steps

1. **Test the fixes** with the current authentication issue
2. **Monitor logs** for any remaining issues
3. **Update client code** to use the enhanced API client
4. **Set up monitoring** for the debug endpoints
5. **Consider implementing** user session management improvements

## Support

If issues persist:
1. Check server logs for detailed error messages
2. Use debug endpoints to gather diagnostic information
3. Verify environment configuration
4. Check database connectivity and data integrity
