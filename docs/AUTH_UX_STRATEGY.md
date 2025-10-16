# SBQC Authentication UX Strategy

**Date**: October 16, 2025  
**Issue**: The Elephant in the Room 🐘

## Current Problems

### 1. **No Visible Login/Logout UI**
- ❌ Navigation bar has NO login/logout button
- ❌ Users don't know they CAN log in
- ❌ No indication of logged-in status
- ❌ No user profile/account dropdown

### 2. **Inconsistent Protected Features**
- ⚠️ Only 2 endpoints require auth (`/alarms/setAlarm`, `/saveProfile`)
- ⚠️ No visual feedback when these features need login
- ⚠️ No clear indication which features are enhanced when logged in

### 3. **Login Flow is Hidden**
- 🔍 Login page exists at `/login` but no links to it
- 🔍 Users have to manually type URL to log in
- 🔍 No "Login to access this feature" prompts

---

## Proposed Solution: Standardized Authentication UX

### Phase 1: Add Login/Logout to Navigation ✅

**Update `views/partials/nav.ejs`** to show login status:

```html
<!-- Add to navigation bar (right side) -->
<% if (locals.user) { %>
    <!-- User is logged in -->
    <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" 
           data-mdb-toggle="dropdown" aria-expanded="false">
            <i class="fas fa-user-circle"></i>
            <span class="nav-link-text"><%= user.name %></span>
        </a>
        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
            <li><a class="dropdown-item" href="https://data.specialblend.ca/settings">
                <i class="fas fa-cog"></i> Settings
            </a></li>
            <li><a class="dropdown-item" href="https://data.specialblend.ca/profile">
                <i class="fas fa-user"></i> Profile
            </a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="/login/out">
                <i class="fas fa-sign-out-alt"></i> Logout
            </a></li>
        </ul>
    </li>
<% } else { %>
    <!-- User is NOT logged in -->
    <li class="nav-item">
        <a class="nav-link" href="/login">
            <i class="fas fa-sign-in-alt"></i>
            <span class="nav-link-text">Login</span>
        </a>
    </li>
<% } %>
```

---

### Phase 2: Create Reusable Auth Status Component ✅

**Create `views/partials/authStatus.ejs`**:

```html
<!-- Authentication Status Badge -->
<% if (locals.user) { %>
    <div class="auth-status logged-in">
        <i class="fas fa-check-circle text-success"></i>
        Logged in as <strong><%= user.name %></strong>
        <a href="/login/out" class="btn btn-sm btn-outline-secondary ms-2">Logout</a>
    </div>
<% } else { %>
    <div class="auth-status logged-out">
        <i class="fas fa-info-circle text-info"></i>
        <a href="/login" class="btn btn-sm btn-primary">Login</a> for enhanced features
    </div>
<% } %>
```

---

### Phase 3: Protected Feature Pattern ✅

**Standard pattern for features requiring auth**:

```html
<!-- Example: Alarm Control (requires auth) -->
<div class="protected-feature">
    <% if (locals.user) { %>
        <!-- Show the feature -->
        <h3>Set Device Alarm</h3>
        <form action="/alarms/setAlarm" method="POST">
            <!-- alarm form fields -->
            <button type="submit" class="btn btn-primary">Save Alarm</button>
        </form>
    <% } else { %>
        <!-- Show login prompt -->
        <div class="login-required-message">
            <i class="fas fa-lock fa-3x mb-3 text-muted"></i>
            <h4>Login Required</h4>
            <p>You must be logged in to set device alarms.</p>
            <a href="/login" class="btn btn-primary">Login Now</a>
        </div>
    <% } %>
</div>
```

---

### Phase 4: Enhanced Features Pattern ✅

**For features that work better when logged in** (optional auth):

```html
<!-- Example: Device Dashboard (enhanced when logged in) -->
<div class="enhanced-feature">
    <h3>Device Dashboard</h3>
    
    <% if (locals.user) { %>
        <!-- Enhanced view for logged-in users -->
        <div class="alert alert-success">
            <i class="fas fa-star"></i>
            You're seeing your personalized device list
        </div>
        <div class="device-list">
            <!-- Show user's specific devices -->
        </div>
    <% } else { %>
        <!-- Basic view for public users -->
        <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            Showing public devices. <a href="/login">Login</a> to see your personal devices.
        </div>
        <div class="device-list">
            <!-- Show public/demo devices -->
        </div>
    <% } %>
</div>
```

---

## Implementation Plan

### Step 1: Update Navigation Bar
**File**: `views/partials/nav.ejs`

Add user dropdown with login/logout to the navigation.

### Step 2: Create Auth Components
**Files**:
- `views/partials/authStatus.ejs` - Status badge
- `views/partials/loginPrompt.ejs` - Login required message

### Step 3: Update Pages with Protected Features
**Pages to update**:
- `views/device.ejs` - Alarm controls
- `views/iot.ejs` - Device controls
- `views/graphs.ejs` - Profile management

### Step 4: Add CSS Styling
**File**: `public/css/sbqc.css`

```css
/* Authentication UI Styles */
.auth-status {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    margin: 1rem 0;
    display: inline-block;
}

.auth-status.logged-in {
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
}

.auth-status.logged-out {
    background-color: #d1ecf1;
    border: 1px solid #bee5eb;
}

.login-required-message {
    text-align: center;
    padding: 3rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    border: 2px dashed #dee2e6;
}

.protected-feature {
    position: relative;
}

.enhanced-feature .alert {
    margin-bottom: 1rem;
}
```

---

## Detailed Implementation

### Navigation Bar Update

```html
<!-- File: views/partials/nav.ejs -->
<nav class='navbar navbar-expand-lg fixed-top semi-translucent-navbar'>  
    <div class="container">
        <a class="navbar-brand" href="/index">
            <img src="img/favicon.ico" height=48>
        </a>
        
        <button data-mdb-collapse-init class="navbar-toggler" type="button" 
                data-mdb-toggle="collapse" data-mdb-target="#navbarSupportedContent">
            <i class="fas fa-bars"></i>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
            <ul class="navbar-nav ms-auto align-items-center">
                
                <!-- Existing menu items -->
                <li class="nav-item">
                    <a class="nav-link" href="/earth">
                        <i class="fas fa-fw fa-globe"></i> 
                        <span class="nav-link-text">Earth</span>
                    </a>
                </li>
                
                <li class="nav-item">
                    <a class="nav-link" href="/iss-detector">
                        <i class="fas fa-fw fa-satellite"></i>
                        <span class="nav-link-text">ISS</span>
                    </a>
                </li>
                
                <li class="nav-item">
                    <a class="nav-link" href="/iot">
                        <i class="fa-solid fa-network-wired"></i>
                        <span class="nav-link-text">IoT</span>
                    </a>
                </li>
                
                <li class="nav-item">
                    <a class="nav-link" href="/tools">
                        <i class="fas fa-fw fa-tools"></i> 
                        <span class="nav-link-text">Tools</span>
                    </a>
                </li>
                
                <!-- Divider before auth section -->
                <li class="nav-item">
                    <span class="nav-link text-muted">|</span>
                </li>
                
                <!-- NEW: Authentication Section -->
                <% if (locals.user) { %>
                    <!-- Logged In: User Dropdown -->
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle d-flex align-items-center" 
                           href="#" id="userDropdown" role="button" 
                           data-mdb-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-user-circle fa-lg me-2"></i>
                            <span class="nav-link-text"><%= user.name %></span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                            <li class="dropdown-header">
                                <small class="text-muted"><%= user.email %></small>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item" href="https://data.specialblend.ca/settings">
                                    <i class="fas fa-cog me-2"></i> Settings
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="https://data.specialblend.ca/profile">
                                    <i class="fas fa-user me-2"></i> Profile
                                </a>
                            </li>
                            <% if (user.isAdmin) { %>
                            <li>
                                <a class="dropdown-item" href="https://data.specialblend.ca/admin">
                                    <i class="fas fa-crown me-2 text-warning"></i> Admin
                                </a>
                            </li>
                            <% } %>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger" href="/login/out">
                                    <i class="fas fa-sign-out-alt me-2"></i> Logout
                                </a>
                            </li>
                        </ul>
                    </li>
                <% } else { %>
                    <!-- Not Logged In: Login Button -->
                    <li class="nav-item">
                        <a class="nav-link btn btn-outline-primary btn-sm d-flex align-items-center" 
                           href="/login">
                            <i class="fas fa-sign-in-alt me-2"></i>
                            <span class="nav-link-text">Login</span>
                        </a>
                    </li>
                <% } %>
                
            </ul>
        </div>   
    </div>
</nav>
```

---

## Benefits of This Approach

### 1. **Visibility** ✅
- Users can see login/logout in every page
- Clear indication of authentication status
- User name displayed when logged in

### 2. **Consistency** ✅
- Same pattern across all pages
- Standardized components (`authStatus`, `loginPrompt`)
- Unified CSS styling

### 3. **Clarity** ✅
- Protected features show "Login Required" message
- Enhanced features explain benefits of logging in
- No confusion about what requires authentication

### 4. **User Experience** ✅
- Easy one-click login from any page
- User dropdown for quick access to settings
- Graceful degradation for non-logged-in users

---

## Pages Requiring Updates

### High Priority (Has Protected Features)

1. **`views/device.ejs`** - Alarm controls require auth
2. **`views/iot.ejs`** - Enhanced device list when logged in
3. **`views/graphs.ejs`** - Profile management requires auth

### Medium Priority (Could Show Auth Status)

4. **`views/dashboard.ejs`** - Personalized dashboard
5. **`views/index.ejs`** - Welcome message for logged-in users

### Low Priority (Pure Public Pages)

6. All other pages - No changes needed (already public)

---

## Migration Checklist

- [ ] Create `views/partials/authStatus.ejs`
- [ ] Create `views/partials/loginPrompt.ejs`
- [ ] Update `views/partials/nav.ejs` with user dropdown
- [ ] Add CSS styles to `public/css/sbqc.css`
- [ ] Update `views/device.ejs` (alarm controls)
- [ ] Update `views/iot.ejs` (device list)
- [ ] Update `views/graphs.ejs` (profile management)
- [ ] Test login/logout flow
- [ ] Test protected features prompt correctly
- [ ] Test user dropdown links work

---

## Next Steps

**START HERE**:
1. Update navigation bar to show login/logout
2. Create reusable auth components
3. Apply to one page (device.ejs) as proof of concept
4. Roll out to other pages

**Would you like me to:**
- A) Implement the navigation bar update now?
- B) Create the reusable components first?
- C) Show a complete example for one page?

Let me know and I'll start implementing! 🚀
