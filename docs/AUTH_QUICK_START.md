# Authentication Setup - Quick Answer

## The Answer: How to Authenticate

### 🔑 **You log in at `/login`**

1. **Open your browser** and navigate to:
   ```
   http://localhost:3001/login
   ```

2. **Enter your credentials**:
   - Email address (must be registered in DataAPI's users collection)
   - Password

3. **Click Login**

4. **You're redirected to `/settings`** and now authenticated!

That's it! 🎉

---

## What Was Missing?

You correctly identified the issue! We integrated the **authentication middleware** but the **login flow** wasn't connecting properly.

### The Problem

The SBQC login was setting:
```javascript
req.session.userToken = token  // ❌ JWT token
req.session.email = email
```

But nodeTools auth middleware was looking for:
```javascript
req.session.userId = user._id  // ✅ MongoDB ObjectId
```

### The Fix

Updated `routes/login.routes.js` to set **both** values:
```javascript
req.session.userId = user._id.toString() // ✅ For nodeTools
req.session.email = result.email
req.session.userToken = result.token     // For backward compatibility
```

Now when you log in:
1. ✅ Session is created with `userId`
2. ✅ nodeTools `attachUser` middleware finds the user
3. ✅ `res.locals.user` is populated
4. ✅ Protected routes work!

---

## Testing It Now

### 1. Access Login Page

The server is already running on port 3001. Open your browser:
```
http://localhost:3001/login
```

### 2. Check What You'll See

**If you don't have an account yet**:
- Click "Register" (at `/login/register`)
- Create an account
- Then log in

**If you have an account**:
- Enter email and password
- Click "Login"

### 3. After Login

You'll be redirected to `/settings` and see:
- Your device settings
- User profile
- Dashboard features

The terminal will show:
```
[AUTH] attachUser: User found: YourName (your@email.com)
```

### 4. Logout

To log out, navigate to:
```
http://localhost:3001/login/out
```

---

## Session Sharing Bonus

If you also have **DataAPI** running:

1. **Log in to DataAPI** first:
   ```
   http://localhost:3003/login
   ```

2. **Then navigate to SBQC**:
   ```
   http://localhost:3001
   ```

3. **You're already logged in!** 🚀

Both apps share the same session cookie (`data-api.sid`) stored in MongoDB.

---

## Protected Routes

Once logged in, you can access:

| Route | What It Shows |
|-------|---------------|
| `/settings` | User settings and device management |
| `/api/deviceLatest/:esp` | Latest device data for specific ESP |
| `/api/data/:options` | Historical device data |
| `/alarms/setAlarm` | Create device alarms |

Without login, these routes will redirect you to `/login`.

---

## Quick Summary

**Before**: Middleware integrated but disconnected from login ❌  
**After**: Login sets `req.session.userId` → middleware finds user → everything works ✅

**How to use**: Just go to `/login` and log in! 🎯

---

## Files Changed

1. **`routes/login.routes.js`**:
   - Added `req.session.userId = user._id.toString()`
   - Now works with nodeTools auth

2. **Documentation Created**:
   - `docs/AUTHENTICATION_GUIDE.md` - Complete auth guide
   - `docs/AUTH_QUICK_START.md` - This file!

---

**Next Steps**: 
- Try logging in at http://localhost:3001/login
- Check terminal logs to see authentication flow
- Access protected routes like `/settings`

**Need Help?**: Check `docs/AUTHENTICATION_GUIDE.md` for detailed troubleshooting.
