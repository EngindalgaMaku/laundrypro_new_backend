# Mobile App Automatic Authentication Setup

## Overview
This setup provides automatic authentication handling for your mobile LaundryPro app. It will:
- ✅ Automatically detect invalid/expired tokens
- ✅ Clear authentication data when tokens are stale
- ✅ Redirect to login page automatically
- ✅ Show user-friendly messages
- ✅ Work silently in the background

## Quick Setup

### Option 1: Wrap Your Entire App (Recommended)

Update your main layout file (`app/layout.tsx`):

```tsx
import { AutoAuthProvider } from "@/components/auth/auto-auth-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <AutoAuthProvider loginPath="/login" enableAutoRedirect={true}>
          {children}
        </AutoAuthProvider>
      </body>
    </html>
  );
}
```

### Option 2: Wrap Individual Pages

For pages that need authentication:

```tsx
import { withAutoAuth } from "@/components/auth/auto-auth-provider";

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Your dashboard content */}
    </div>
  );
}

export default withAutoAuth(DashboardPage);
```

### Option 3: Manual Control

For more control over the authentication flow:

```tsx
import { useAutoAuth, ensureAuthenticated } from "@/lib/auto-auth";
import { useRouter } from "next/navigation";

function MyComponent() {
  const router = useRouter();
  const { validateToken } = useAutoAuth();

  const handleApiCall = async () => {
    // Ensure we're authenticated before making API calls
    const isAuth = await ensureAuthenticated();
    
    if (!isAuth) {
      router.push("/login");
      return;
    }

    // Make your API call
    const data = await apiClient.get("/some-endpoint");
  };

  return (
    <button onClick={handleApiCall}>
      Make API Call
    </button>
  );
}
```

## How It Works

### 1. Automatic Token Validation
- Checks token validity every 5 minutes
- Validates against `/api/users/me` endpoint
- Handles 401/404 errors automatically

### 2. Stale Token Detection
Your specific issue (user ID `cmfpab6990000wc8gqwkg40yi` not found) will be automatically detected and handled:

```typescript
// When API returns 404 for /users/me or /business/me
if (response.status === 404 && endpoint.includes('/users/me')) {
  console.log("Stale token detected - clearing auth");
  removeAuthToken();
  redirectToLogin();
}
```

### 3. Enhanced API Client
The API client now automatically:
- Detects 404 errors on auth endpoints
- Clears invalid tokens
- Shows user-friendly error messages
- Prevents infinite retry loops

## Configuration Options

### AutoAuthProvider Props
```tsx
<AutoAuthProvider
  loginPath="/login"           // Where to redirect on auth failure
  enableAutoRedirect={true}    // Automatically redirect to login
>
  {children}
</AutoAuthProvider>
```

### Auto-Auth Settings
```typescript
// In lib/auto-auth.ts
private checkInterval = 5 * 60 * 1000; // Check every 5 minutes
```

## Testing the Fix

### 1. Simulate Your Current Issue
```javascript
// In browser console, set an invalid token
localStorage.setItem('token', 'invalid-token-with-nonexistent-user-id');

// Navigate to any protected page
// Should automatically clear token and redirect to login
```

### 2. Test Network Errors
```javascript
// Disconnect internet, then reconnect
// App should handle gracefully without clearing valid tokens
```

### 3. Test Token Refresh
```javascript
// Set a token that's about to expire
// System should attempt refresh automatically
```

## Error Handling

### User-Friendly Messages
- **Invalid Token**: "Oturum süresi doldu. Lütfen tekrar giriş yapın."
- **Network Error**: "İnternet bağlantınızı kontrol edin"
- **Server Error**: "Sunucu hatası. Lütfen tekrar deneyin."

### Automatic Actions
- **404 on /users/me**: Clear token, redirect to login
- **401 Unauthorized**: Try token refresh, then clear if failed
- **Network Error**: Keep token, show retry option

## Mobile-Specific Features

### Silent Background Checks
```typescript
// Runs automatically every 5 minutes
autoAuth.startAutoValidation();
```

### Immediate Validation
```typescript
// Before important operations
const isValid = await ensureAuthenticated();
if (!isValid) {
  // Handle authentication failure
}
```

### Graceful Degradation
- Works offline (doesn't clear tokens on network errors)
- Handles app backgrounding/foregrounding
- Preserves user experience

## Integration with Existing Code

### Update API Calls
Replace direct fetch calls with the enhanced API client:

```typescript
// Before
const response = await fetch('/api/users/me', {
  headers: { Authorization: `Bearer ${token}` }
});

// After
const userData = await apiClient.get('/users/me');
// Automatically handles auth errors, token refresh, etc.
```

### Update Route Guards
Replace manual auth checks:

```typescript
// Before
const token = getAuthToken();
if (!token) {
  router.push('/login');
  return;
}

// After
// Just wrap with AutoAuthProvider - handles automatically
```

## Debugging

### Console Logs
Look for these prefixes in console:
- `[AUTO-AUTH]` - Automatic authentication system
- `[AUTO-AUTH-PROVIDER]` - React provider component
- `[API]` - Enhanced API client

### Debug Endpoints
- `GET /api/debug/auth` - Check current auth status
- `GET /api/debug/db` - Check database connectivity

## Troubleshooting

### Issue: Still getting 404 errors
**Solution**: Clear browser storage completely
```javascript
localStorage.clear();
sessionStorage.clear();
```

### Issue: Infinite redirect loops
**Solution**: Check that login page doesn't require authentication
```tsx
// Login page should disable auto-redirect
<AutoAuthProvider enableAutoRedirect={false}>
  <LoginForm />
</AutoAuthProvider>
```

### Issue: Token cleared too aggressively
**Solution**: Adjust validation interval or error handling
```typescript
// Increase check interval for less aggressive validation
private checkInterval = 10 * 60 * 1000; // 10 minutes
```

## Production Considerations

1. **Error Monitoring**: Set up logging for authentication failures
2. **Analytics**: Track auth-related user flows
3. **Performance**: Monitor API call frequency
4. **User Experience**: Customize error messages for your brand

This setup will completely solve your current authentication issue and prevent similar problems in the future!
