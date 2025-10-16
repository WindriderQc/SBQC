# Profile Management - Dead Code Cleanup

**Date**: October 16, 2025  
**Issue**: "Create Config Profile" button crashes - route doesn't exist

## Problem Analysis

### What Was Found

1. **Dead Button** in `views/iot.ejs`:
   - Button labeled "Create Config Profile"
   - Links to `/device-config-profile` 
   - **This route does not exist** → causes 404 crash

2. **Dead Form** in `views/partials/iot/config-profile-form.ejs`:
   - Complete form for creating device config profiles
   - Posts to `/saveProfile` endpoint
   - **Never included in any view** → orphaned code

3. **Legacy Endpoint** in `routes/api.routes.js`:
   - `POST /saveProfile` still exists
   - Requires authentication (`auth.requireAuth`)
   - Proxies to DataAPI's `/profile/:profileName` endpoint
   - Not used by any frontend forms

### Root Cause

**Profile management was migrated to DataAPI** but cleanup was incomplete:
- ✅ DataAPI now has frontend for profile management
- ✅ DataAPI has backend endpoints for profiles
- ❌ SBQC still has dead button pointing to non-existent route
- ❌ SBQC still has unused form partial
- ⚠️ SBQC still has `/saveProfile` endpoint (probably unused)

## Solution Implemented

### Fixed `views/iot.ejs`

**Before**:
```html
<div class="row mt-2">
  <div class="col-sm-12">
    <div class="card">
      <div class="card-body">
        <a href="/device-config-profile" class="btn btn-primary">Create Config Profile</a>
      </div>
    </div>
  </div>
</div>
```

**After**:
```html
<% if (locals.user) { %>
<div class="row mt-2">
  <div class="col-sm-12">
    <div class="card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h5 class="mb-1">Device Configuration Profiles</h5>
            <p class="text-muted mb-0">Manage device configuration profiles in DataAPI</p>
          </div>
          <a href="https://data.specialblend.ca/profiles" target="_blank" class="btn btn-primary">
            <i class="fas fa-cog me-2"></i>Manage Profiles
            <i class="fas fa-external-link-alt ms-2"></i>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
<% } else { %>
<div class="row mt-2">
  <div class="col-sm-12">
    <%- include('partials/loginPrompt', { feature: 'manage device configuration profiles' }) %>
  </div>
</div>
<% } %>
```

**Changes**:
- ✅ Button now links to DataAPI's profile page (external)
- ✅ Shows login prompt if user not authenticated
- ✅ Better UX with descriptive text
- ✅ External link icon to indicate opens in new tab

## Recommended Further Cleanup

### 1. Delete Dead Code

The following files/code are **no longer used**:

```bash
# Delete unused form partial
rm views/partials/iot/config-profile-form.ejs
```

### 2. Consider Removing `/saveProfile` Endpoint

**In `routes/api.routes.js` (lines 93-102)**:
```javascript
// TODO: Consider migrating to DataAPI frontend
router.post('/saveProfile', auth.requireAuth, async (req, res, next) => {
    try {
        const { profileName, config } = req.body;
        await dataApiService.saveProfile(profileName, config);
        res.send('Profile saved successfully!');
    } catch (err) {
        next(err);
    }
});
```

**Recommendation**: 
- Check if any external scripts/tools use this endpoint
- If not used, **remove it** (profiles are fully managed in DataAPI now)
- If removing, also remove `saveProfile()` from `services/dataApiService.js`

### 3. Architecture Alignment

Following the **SBQC = Monitoring, DataAPI = Management** pattern:

**SBQC Should Handle**:
- ✅ Device visualization (graphs, live data)
- ✅ Real-time monitoring (MQTT, streaming)
- ✅ Public data access (weather, tides, ISS)

**DataAPI Should Handle**:
- ✅ Device registration
- ✅ Profile management ← **This is now correctly in DataAPI**
- ✅ Alarm configuration
- ✅ User settings

## Testing

1. **Test the Fix**:
   ```bash
   cd /home/yb/servers/SBQC
   npm run dev
   ```

2. **As Logged In User**:
   - Navigate to `/iot`
   - Should see "Manage Profiles" button
   - Click button → Opens DataAPI profiles page in new tab

3. **As Guest User**:
   - Navigate to `/iot`
   - Should see login prompt for profile management
   - Click Login → Redirects to login page

## Files Modified

- ✅ `views/iot.ejs` - Fixed dead button, added auth protection

## Files to Consider Deleting

- ⏭️ `views/partials/iot/config-profile-form.ejs` - Orphaned form
- ⏭️ `routes/api.routes.js` - `/saveProfile` endpoint (if unused)
- ⏭️ `services/dataApiService.js` - `saveProfile()` function (if unused)

## Status

- ✅ **Crash Fixed** - No more 404 on "Create Config Profile" button
- ✅ **Auth Protected** - Login required to access profile management
- ✅ **Proper Redirect** - Points to DataAPI's profile page
- ⏭️ **Dead Code Cleanup** - Pending removal of unused files

---

**Summary**: The "Create Config Profile" button was pointing to a non-existent route. Fixed by redirecting to DataAPI's profile management page (where this feature actually lives) and adding authentication protection.
