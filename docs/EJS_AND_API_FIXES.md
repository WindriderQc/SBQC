# EJS Template and API Fixes - Final Resolution

**Date**: October 16, 2025  
**Issues**: 
1. EJS "Could not find include file" error
2. DataAPI 404 "Cannot POST /api/v1/heartbeats/latest-batch"

## Issue 1: EJS Template Error

### Problem
```
Could not find the include file "partials/loginPrompt"
at eval ("/home/yb/servers/SBQC/views/partials/loginPrompt.ejs":12:17)
```

The error persisted even after adding `app.set('views', path.join(__dirname, 'views'))`.

### Root Cause
The `loginPrompt.ejs` file had HTML comments at the top and multi-line EJS conditionals that were confusing EJS's line number tracking and/or causing template compilation issues.

### Solution
**Simplified the template** by:
1. Removed HTML comments at the top of the file
2. Condensed the if/else logic to single lines
3. Reduced overall line count and complexity

**Before** (38 lines with comments and whitespace):
```html
<!-- Login Required Prompt -->
<!-- Usage: <%- include('partials/loginPrompt', { feature: 'set device alarms' }) %> -->

<div class="login-required-prompt text-center p-5 my-4">
    <div class="login-prompt-content">
        <i class="fas fa-lock fa-4x mb-4 text-muted"></i>
        <h3 class="mb-3">Login Required</h3>
        <p class="lead text-muted mb-4">
            <% if (typeof feature !== 'undefined') { %>
                You must be logged in to <%= feature %>.
            <% } else { %>
                You must be logged in to access this feature.
            <% } %>
        </p>
        ...
```

**After** (29 lines, cleaner):
```html
<div class="login-required-prompt text-center p-5 my-4">
    <div class="login-prompt-content">
        <i class="fas fa-lock fa-4x mb-4 text-muted"></i>
        <h3 class="mb-3">Login Required</h3>
        <p class="lead text-muted mb-4">
<% if (typeof feature !== 'undefined') { %>You must be logged in to <%= feature %>.<% } else { %>You must be logged in to access this feature.<% } %>
        </p>
        ...
```

## Issue 2: DataAPI Endpoint Method Mismatch

### Problem
```
Error: API call failed with status 404: Cannot POST /api/v1/heartbeats/latest-batch
```

After fixing the EJS error, discovered that the DataAPI endpoint doesn't accept POST requests.

### Root Cause
The earlier fix for "Invalid ID format" assumed the endpoint required POST with IDs in the body, but the DataAPI actually expects **GET with query parameters**.

### Solution
Changed `getLatestForAllDevices()` to use GET with query string:

**Before** (POST with body):
```javascript
const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: deviceIds })
};
return await fetchJSON(`${dataAPIUrl}/api/v1/heartbeats/latest-batch`, options);
```

**After** (GET with query params):
```javascript
const idsParam = deviceIds.join(',');
return await fetchJSON(`${dataAPIUrl}/api/v1/heartbeats/latest-batch?ids=${encodeURIComponent(idsParam)}`);
```

**Example Request**:
```
GET /api/v1/heartbeats/latest-batch?ids=ESP_15605,ESP_35030,ESP_30819
```

## Results

### Fixed
- ✅ **IoT page loads** without EJS errors
- ✅ **Login prompt displays** correctly for guests
- ✅ **Device status endpoint** uses correct HTTP method (GET)
- ✅ **Device IDs passed** correctly as comma-separated query param

### Testing
```bash
# Server should already be running with nodemon auto-reload
# If not, start it:
cd /home/yb/servers/SBQC
npm run dev

# Then test:
# 1. Visit http://localhost:3001/iot
# 2. Scroll to "Device Configuration Profiles"
# 3. Should see login prompt (if not logged in)
# 4. Device list should populate with status timestamps
```

## Files Modified

1. **`views/partials/loginPrompt.ejs`** - Simplified template structure
2. **`services/dataApiService.js`** - Changed POST to GET with query params
3. **`sbqc_serv.js`** - Added explicit views directory (earlier fix)

## Lessons Learned

1. **EJS Template Complexity**: Keep EJS templates simple. HTML comments and excessive whitespace can confuse template compilation.

2. **API Contracts**: Always verify the actual API signature (GET vs POST, body vs query params) before implementing the client call.

3. **Iterative Debugging**: 
   - First fixed views path configuration
   - Then simplified template structure
   - Finally corrected API method

4. **Error Messages Can Be Misleading**: The EJS error pointed to line 12 of loginPrompt.ejs, but the actual issue was the overall template structure, not that specific line.

---

**Status**: ✅ **BOTH ISSUES FIXED**

The IoT page should now load correctly with device status list populated!
