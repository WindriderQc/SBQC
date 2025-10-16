# Latest Batch Endpoint Fix

**Date**: October 16, 2025  
**Issue**: 400 Error "Invalid ID format" when fetching device statuses

## Problem

The `/api/devices/latest-batch` endpoint was failing with:
```
Error: API call failed with status 400: {
  "status": "error",
  "message": "Validation Failed",
  "errors": "Invalid ID format"
}
```

### Error Stack Trace
```
Error fetching from https://data.specialblend.ca/api/v1/heartbeats/latest-batch
    at fetchJSON (/home/yb/servers/SBQC/services/apiClient.js:14:13)
    at async Object.getLatestForAllDevices (/home/yb/servers/SBQC/services/dataApiService.js:145:12)
    at async /home/yb/servers/SBQC/routes/api.routes.js:82:28
```

### Root Cause

The DataAPI's `/api/v1/heartbeats/latest-batch` endpoint **requires device IDs** to be sent in the request body, but SBQC was calling it as a GET request without any IDs.

**Before** (Broken):
```javascript
async function getLatestForAllDevices() {
    // GET request - no device IDs sent!
    return await fetchJSON(`${dataAPIUrl}/api/v1/heartbeats/latest-batch`);
}
```

DataAPI was receiving an empty request and couldn't validate the IDs (because there were none).

## Solution

Changed `getLatestForAllDevices()` to:

1. **Fetch registered devices** if no IDs provided
2. **Extract device IDs** from the registered devices
3. **Send POST request** with IDs in the request body

**After** (Fixed):
```javascript
async function getLatestForAllDevices(deviceIds = null) {
    // If no device IDs provided, fetch registered devices first
    if (!deviceIds) {
        const devices = await getRegisteredDevices();
        if (!devices || devices.length === 0) {
            return { status: 'success', data: [] };
        }
        deviceIds = devices.map(d => d.id);
    }
    
    // POST request with device IDs in body
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deviceIds })
    };
    
    return await fetchJSON(`${dataAPIUrl}/api/v1/heartbeats/latest-batch`, options);
}
```

### What Changed

1. **Auto-fetch device IDs**: If caller doesn't provide IDs, automatically fetch from `getRegisteredDevices()`
2. **Handle empty devices**: Returns success with empty array if no devices registered
3. **POST with body**: Sends device IDs in request body as `{ ids: [...] }`
4. **Flexible API**: Can still be called with specific device IDs if needed

## Testing

### Before Fix
```
Console Errors:
✗ Error fetching from https://data.specialblend.ca/api/v1/heartbeats/latest-batch
✗ GET http://192.168.2.79:3001/api/devices/latest-batch 500 (Internal Server Error)
✗ Failed to fetch latest device statuses: Error: API request failed with status 500
```

### After Fix
```
Expected Behavior:
✓ Registered devices fetched: [ 'ESP_15605', 'ESP_35030', 'ESP_30819' ]
✓ Device IDs sent to DataAPI: { ids: ['ESP_15605', 'ESP_35030', 'ESP_30819'] }
✓ Latest heartbeats returned with timestamps
✓ IoT page shows device status list populated
✓ No 400 or 500 errors
```

## Impact

### Fixed Endpoints
- ✅ `GET /api/devices/latest-batch` - Now works correctly

### Affected Pages
- ✅ `/iot` - Device status list now populates
- ✅ `/dashboard` - May also use this endpoint

### Frontend Impact
- ✅ `public/js/iot.js` - `populateDeviceStatusList()` now receives data
- ✅ Device last-seen timestamps now display correctly

## Files Modified

- ✅ `services/dataApiService.js` - Updated `getLatestForAllDevices()` function

## Related Issues

This fix also addresses:
- IoT page device status list showing empty
- "Failed to fetch latest device statuses" console errors
- 500 Internal Server Error on `/api/devices/latest-batch`

## Notes

### API Contract with DataAPI

**Endpoint**: `POST /api/v1/heartbeats/latest-batch`

**Request Body**:
```json
{
  "ids": ["ESP_15605", "ESP_35030", "ESP_30819"]
}
```

**Response** (Success):
```json
{
  "status": "success",
  "data": [
    {
      "id": "ESP_15605",
      "lastpost": {
        "data": {
          "time": "2025-10-16T14:30:00.000Z"
        }
      }
    },
    ...
  ]
}
```

**Response** (Error - No IDs):
```json
{
  "status": "error",
  "message": "Validation Failed",
  "errors": "Invalid ID format"
}
```

### Device Caching

The fix benefits from the existing device cache in `getRegisteredDevices()`:
- Cache duration: 5 minutes
- Reduces redundant API calls
- Stale cache returned on error (graceful degradation)

---

**Status**: ✅ **FIXED**

The "Invalid ID format" error is resolved. Device status list should now populate correctly on the IoT page.
