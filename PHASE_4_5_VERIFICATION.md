# Phase 4 & 5 Verification Checklist

## Build Status
✅ **Build Successful**: 1790 modules transformed in 19.25s
✅ **No TypeScript Errors**
✅ **All Components Compiled**

---

## Phase 4: View-As System - Verification Steps

### 1. GM Control Panel Access
- [ ] Navigate to `/admin/gateway` and login as GM
- [ ] Go to `/admin/settings/gm-control`
- [ ] Verify control panel loads with three tabs

### 2. View-As Functionality
- [ ] In GM Control Panel, click "عرض كـ" (View As) on any staff member
- [ ] Verify ViewAsBanner appears at top of screen (orange/red)
- [ ] Verify banner shows: staff name, role, department, live timer
- [ ] Verify redirect to `/admin/my-work` happens automatically
- [ ] Check that interface shows what that staff member would see

### 3. View-As Timer
- [ ] Wait 10 seconds and verify timer updates (e.g., 0:10, 0:11, 0:12)
- [ ] Timer should show MM:SS format
- [ ] Timer continues updating in real-time

### 4. Exit View-As
- [ ] Click "إنهاء المراقبة" (Stop Monitoring) button in banner
- [ ] Verify banner disappears
- [ ] Verify return to normal GM view

### 5. View-As Logging
- [ ] Return to `/admin/settings/gm-control`
- [ ] Go to "السجلات" (Logs) tab
- [ ] Verify entries show:
  - "بدأ المراقبة" (Started monitoring) with timestamp
  - "أنهى المراقبة" (Stopped monitoring) with timestamp
  - Staff name and path recorded

---

## Phase 5: Staff Provisioning - Verification Steps

### 1. Staff Management Panel Access
- [ ] Login as GM at `/admin/gateway`
- [ ] Navigate to `/admin/settings/staff`
- [ ] Verify panel loads with dashboard stats

### 2. Create New Staff Account
- [ ] Click "إضافة موظف جديد" (Add New Employee)
- [ ] Fill in form:
  - Name (Arabic): "أحمد محمد"
  - Phone: "0501234567"
  - Role: Select any role
  - Department: Select any department
- [ ] Click "إنشاء الحساب" (Create Account)
- [ ] Verify success screen appears showing:
  - Phone number
  - **Temporary password** (8 characters, uppercase)
  - Warning message about one-time display
- [ ] Copy the temporary password
- [ ] Close modal
- [ ] Verify new staff appears in list

### 3. Staff Login via Crown Gateway
- [ ] Logout from GM account
- [ ] Navigate to `/admin/gateway`
- [ ] Verify StaffLoginForm appears
- [ ] Enter:
  - Phone: "0501234567"
  - Password: [paste temporary password]
- [ ] Click "تسجيل الدخول" (Login)
- [ ] Verify successful login
- [ ] Verify redirect to gateway with cards
- [ ] Verify staff name appears in header

### 4. Staff Management Operations
- [ ] Login as GM again
- [ ] Go to `/admin/settings/staff`
- [ ] Find the created staff member
- [ ] Click "⋮" actions menu

#### Suspend Account:
- [ ] Click "إيقاف الحساب" (Suspend Account)
- [ ] Enter reason: "اختبار التعليق"
- [ ] Confirm suspension
- [ ] Verify staff status changes to "موقوف" (Suspended) with red badge
- [ ] Try logging in with that staff account → Should fail with error message

#### Activate Account:
- [ ] In actions menu, click "تفعيل الحساب" (Activate Account)
- [ ] Verify status returns to "نشط" (Active) with green badge
- [ ] Try logging in again → Should succeed

#### Reset Password:
- [ ] In actions menu, click "إعادة تعيين كلمة المرور" (Reset Password)
- [ ] Modal appears with new temporary password
- [ ] Copy the new password
- [ ] Close modal
- [ ] Logout and try logging in with OLD password → Should fail
- [ ] Login with NEW password → Should succeed

### 5. Session Management
- [ ] Login as any staff member
- [ ] Verify session persists on page refresh
- [ ] Click "خروج" (Logout) button
- [ ] Verify return to login form
- [ ] Verify localStorage cleared (check browser dev tools → Application → Local Storage → `staff_session`)

### 6. Search Functionality
- [ ] In Staff Management Panel, use search box
- [ ] Search by name → Should filter results
- [ ] Search by phone → Should filter results
- [ ] Search by role → Should filter results
- [ ] Clear search → Should show all staff

---

## Security Verification

### Database Level
```sql
-- Check password encryption (should be bcrypt hash)
SELECT id, name_ar, phone, length(password_hash) as hash_length, is_active
FROM platform_staff
LIMIT 5;
-- hash_length should be 60 (bcrypt standard)

-- Check audit logs for staff operations
SELECT action, performed_by, target_user, details, created_at
FROM audit_logs
WHERE action IN ('staff_created', 'staff_suspended', 'staff_activated', 'password_reset')
ORDER BY created_at DESC
LIMIT 10;

-- Check impersonation logs
SELECT gm_id, action, target_staff_name, current_path, created_at
FROM executive_impersonation_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Application Level
- [ ] Verify no plain-text passwords stored anywhere
- [ ] Verify temporary password only shown once after creation
- [ ] Verify suspended accounts cannot login
- [ ] Verify only GM can access staff management panel
- [ ] Verify all operations logged to audit_logs

---

## Integration Testing

### Phase 4 + Phase 5 Integration
1. **GM creates staff account**
   - [ ] Create new staff from `/admin/settings/staff`
   - [ ] Note the staff ID

2. **GM uses View-As on new staff**
   - [ ] Go to `/admin/settings/gm-control`
   - [ ] Start View-As for the newly created staff
   - [ ] Verify banner shows correct staff name
   - [ ] Verify staff's limited permissions are applied
   - [ ] Stop View-As

3. **Staff logs in and GM monitors**
   - [ ] Logout as GM
   - [ ] Login as the new staff member
   - [ ] Note what cards/sections appear
   - [ ] Logout
   - [ ] Login as GM again
   - [ ] Start View-As for that staff
   - [ ] Verify same cards/sections appear

---

## Known Behaviors

### Expected:
- Temporary passwords are 8 characters, uppercase alphanumeric
- ViewAsBanner stays fixed at top on all pages during View-As
- Staff session persists in localStorage until logout
- Suspended accounts show red background in staff list
- All operations create audit log entries

### Not Implemented (Future Phases):
- Staff cannot change their own password (no self-service UI yet)
- No MFA/2FA system
- No account expiration dates
- No bulk import/export
- No email notifications

---

## Quick Test Scenario

**10-Minute Complete Test:**

1. **Login as GM** (2 min)
   - Navigate to `/admin/gateway`
   - Use GM credentials

2. **Create Test Staff** (2 min)
   - Go to `/admin/settings/staff`
   - Create staff: "Test User", "0509999999"
   - Copy temporary password

3. **Test Staff Login** (2 min)
   - Logout
   - Login with new staff credentials
   - Verify access
   - Logout

4. **Test View-As** (2 min)
   - Login as GM
   - Go to `/admin/settings/gm-control`
   - Start View-As on test staff
   - Verify banner and interface
   - Stop View-As

5. **Test Suspend** (2 min)
   - Go to `/admin/settings/staff`
   - Suspend test staff
   - Try logging in as test staff → Should fail
   - Reactivate test staff
   - Try logging in again → Should succeed

✅ **If all steps pass, both Phase 4 and Phase 5 are working correctly!**

---

## Troubleshooting

### Issue: "No session found" when trying to access admin routes
- **Solution**: Make sure you logged in through `/admin/gateway`
- Check localStorage for `staff_session` key

### Issue: ViewAsBanner not appearing
- **Solution**: Verify you're logged in as GM (role = 'general_manager')
- Check ImpersonationContext is properly initialized

### Issue: Cannot create staff - "Phone already exists"
- **Solution**: Phone numbers must be unique
- Use different phone number or check existing staff list

### Issue: Password verification failing
- **Solution**: Make sure bcrypt extension is enabled in Supabase
- Check `password_hash` column has value
- Verify using exact password (case-sensitive)

### Issue: Redirect loops or access denied
- **Solution**: Check GatewayGuard and SessionGuard are working
- Verify staff has proper role and permissions
- Check audit logs for access denial reasons

---

## Test Data Cleanup

After testing, clean up test accounts:

```sql
-- Delete test staff account
DELETE FROM platform_staff
WHERE phone = '0509999999';

-- Clean up test logs (optional)
DELETE FROM audit_logs
WHERE details::text LIKE '%0509999999%';

DELETE FROM executive_impersonation_logs
WHERE target_staff_name = 'Test User';
```

---

## Success Criteria

✅ **Phase 4 Complete** if:
- GM can start View-As on any staff
- ViewAsBanner displays correctly with live timer
- GM can stop View-As at any time
- All events logged to executive_impersonation_logs

✅ **Phase 5 Complete** if:
- GM can create staff accounts with auto-generated passwords
- Staff can login through Crown Gateway
- GM can suspend/activate/reset password for any staff
- Sessions persist and logout works correctly
- All operations logged to audit_logs

✅ **Both Phases Integrated** if:
- GM can View-As newly created staff
- Staff permissions apply correctly during View-As
- No conflicts between Phase 4 and Phase 5 features
- Build succeeds with no errors

---

**Document Created**: 2026-01-06
**Status**: Phase 4 & 5 Implementation Complete
**Build**: 1790 modules, 19.25s, ✅ Success
