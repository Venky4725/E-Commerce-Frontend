# Quick Test Checklist - Notification Fixes

## ⚡ 5-Minute Test

### ✅ Test 1: User Isolation (2 min)

1. Login as `user1` / `password123`
2. Click bell → Load Demo Notifications
3. See 3 notifications ✅
4. Logout
5. Login as `user2` / `password123`
6. Click bell → Should be empty ✅
7. **Check console:** "🔄 User changed from user1 to user2, clearing notifications"

**Expected:** Each user has isolated notifications

---

### ✅ Test 2: No Duplicates (1 min)

1. Login as any user
2. Click bell → Load Demo Notifications
3. Count notifications: **3** ✅
4. Refresh page (F5)
5. Count notifications: **Still 3** ✅
6. Click "Load Demo Notifications" again
7. Count notifications: **Still 3** ✅
8. **Check console:** "⚠️ Notification demo-delivered-XXX already exists, skipping"

**Expected:** No duplicate notifications

---

### ✅ Test 3: Time Display (1 min)

1. Check notification times:
   - First: "1 hour ago" ✅
   - Second: "2 hours ago" ✅
   - Third: "1 day ago" ✅

**Expected:** Human-readable times with proper grammar

---

### ✅ Test 4: Logout Cleanup (1 min)

1. Login with notifications loaded
2. Click Logout
3. **Check console:**
   ```
   🚪 Logout button clicked
   🧹 Clearing all notifications
   ✅ Notifications cleared
   ✅ React Query cache cleared
   ✅ Auth store cleared
   ```
4. Login again
5. Click bell → Empty state ✅

**Expected:** Clean slate after logout

---

## 🎯 Pass Criteria

- [ ] User A's notifications don't appear for User B
- [ ] No duplicate notifications after refresh
- [ ] Time displays as "1 hour ago" not "1h ago"
- [ ] Notifications cleared on logout
- [ ] Console shows proper log messages

---

## 🐛 If Something Fails

### Notifications from other users appear:
- Check console for "👤 Setting current user: XXX"
- Check localStorage key: `notification-storage`
- Clear localStorage and try again

### Duplicate notifications:
- Check console for "⚠️ Notification XXX already exists, skipping"
- Clear localStorage: `localStorage.removeItem('notification-storage')`
- Reload page

### Time display wrong:
- Check browser timezone
- Check notification timestamp in console
- Verify timestamp is valid ISO string

### Notifications not cleared on logout:
- Check console for "🧹 Clearing all notifications"
- Verify `clearAllNotifications()` is called in Navbar
- Check localStorage after logout

---

## 📊 Console Commands for Debugging

```javascript
// Check current notifications
JSON.parse(localStorage.getItem('notification-storage'))

// Clear notifications manually
localStorage.removeItem('notification-storage')

// Check current user
JSON.parse(localStorage.getItem('auth-storage'))

// Clear everything
localStorage.clear()
```

---

## ✅ All Tests Pass?

**Congratulations!** 🎉

All notification issues are fixed:
- ✅ User isolation working
- ✅ No duplicates
- ✅ Better time display
- ✅ Logout cleanup working

The notification system is production-ready!
