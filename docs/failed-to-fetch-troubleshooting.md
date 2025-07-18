# "Failed to Fetch" Error Troubleshooting Guide

## Issue Description
Users encountering "Failed to fetch" error when submitting applications through the web form.

## Root Cause
The "Failed to fetch" error is a generic browser error that occurs when the JavaScript `fetch()` API cannot complete a request. This typically happens when:

1. **Development server is not running**
2. **Network connectivity issues**
3. **CORS configuration problems**
4. **API endpoint doesn't exist**
5. **Environment variables missing or incorrect**

## Solution Steps

### 1. Verify Development Server is Running

**Check if the server is running:**
```bash
# In the project directory
npm run dev
```

**Expected output:**
```
▲ Next.js 15.3.4
- Local:        http://localhost:3000
- Network:      http://192.168.0.134:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 10.3s
```

**If server fails to start:**
```bash
# Install dependencies first
npm install

# Then start the server
npm run dev
```

### 2. Verify Environment Variables

**Check `.env.local` file exists and contains:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://tigknjhplktzqzradmkd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Test API Endpoints

**Use the provided test file:**
1. Open `test-application-api.html` in your browser
2. Click "Test Server Connection" - should show server is running
3. Click "Test Application API" - should show API endpoint is accessible
4. Click "Submit Sample Application" - should successfully submit

### 4. Check Browser Console

**Open browser developer tools (F12) and check for:**
- Network errors in the Network tab
- JavaScript errors in the Console tab
- CORS errors (Cross-Origin Resource Sharing)

### 5. Verify Database Connection

**Test Supabase connection:**
```javascript
// In browser console
fetch('https://tigknjhplktzqzradmkd.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'your-anon-key-here'
  }
})
.then(response => console.log('Supabase connection:', response.status))
.catch(error => console.error('Supabase error:', error));
```

## Common Issues and Fixes

### Issue 1: Server Not Running
**Symptoms:** "Failed to fetch" on all API calls
**Solution:** Start the development server with `npm run dev`

### Issue 2: Port Already in Use
**Symptoms:** Server fails to start with "port already in use"
**Solution:** 
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use a different port
npm run dev -- -p 3001
```

### Issue 3: Environment Variables Missing
**Symptoms:** Server starts but API calls fail with authentication errors
**Solution:** Verify `.env.local` file exists and contains correct Supabase credentials

### Issue 4: Database Table Missing
**Symptoms:** API returns database errors
**Solution:** Run the database schema setup:
```sql
-- Execute in Supabase SQL Editor
-- Copy contents from database/staff_management_schema.sql
```

### Issue 5: CORS Issues
**Symptoms:** "CORS policy" errors in browser console
**Solution:** Ensure you're accessing the app via `http://localhost:3000` not file:// protocol

## Testing Checklist

- [ ] Development server is running on http://localhost:3000
- [ ] Environment variables are correctly set
- [ ] Browser can access http://localhost:3000
- [ ] API endpoints respond (test with test-application-api.html)
- [ ] Database tables exist and are accessible
- [ ] No JavaScript errors in browser console
- [ ] Network tab shows successful API calls

## Prevention Measures

1. **Always start the development server before testing**
2. **Use the test file to verify API functionality**
3. **Check browser console for detailed error messages**
4. **Ensure environment variables are properly configured**
5. **Verify database schema is up to date**

## Additional Resources

- **Test File:** `test-application-api.html` - Use this to verify API functionality
- **Server Logs:** Check terminal output where `npm run dev` is running
- **Browser DevTools:** Network and Console tabs for detailed error information
- **Supabase Dashboard:** Verify database tables and API keys

## Contact Information

If the issue persists after following these steps, check:
1. Terminal output for server errors
2. Browser console for client-side errors
3. Supabase dashboard for database connectivity
4. Network connectivity to Supabase services
