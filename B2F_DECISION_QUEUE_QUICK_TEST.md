# B2F Decision Queue - Quick Testing Guide

## 🎯 Quick Overview

**What:** Unified approval system for B2F sensitive operations
**Where:** `/admin/b2f/farm-command` → Click "قرارات معلقة" KPI card
**Status:** ✅ Ready to Test

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Access Decision Queue

1. Login to platform
2. Navigate to: `/admin/b2f/farm-command`
3. Look at KPI cards row
4. Find card: **"قرارات معلقة"** (should show count)
5. Click the card
6. Decision Queue panel should appear below

**Expected:** Panel slides in showing all pending B2F decisions

---

### Step 2: View a Decision

**Each decision card shows:**
- Decision type icon and Arabic name
- Farm name and location
- Priority badge (عاجل/عالي/عادي/منخفض)
- Amount (if expense)
- Requester name
- Time pending (hours/days)
- Required roles
- Action buttons (رفض / اعتماد)

---

### Step 3: Approve a Decision

1. Find any pending decision
2. Click **"اعتماد"** button (green, on right)
3. Confirm in alert dialog
4. Wait for processing (shows spinner)
5. Success alert appears
6. Decision disappears from queue

**Expected:**
- Target updated (expense approved, task approved, etc.)
- Decision status = 'executed'
- Logged in executive_logs

---

### Step 4: Reject a Decision

1. Find any pending decision
2. Click **"رفض"** button (red, on left)
3. Modal opens: "رفض القرار"
4. Enter rejection reason (required)
5. Click **"تأكيد الرفض"**
6. Success alert appears
7. Decision disappears from queue

**Expected:**
- Decision status = 'rejected'
- Notes updated with rejection reason

---

## 📋 Test Cases (15 Minutes)

### Test 1: Small Expense Approval
```
Create decision:
- Type: approve_expense
- Amount: 3,500 SAR
- Expected required_roles: ['super_admin', 'b2f_assistant']
- Expected priority: normal

Test as GM: Should approve ✅
Test as B2F Assistant: Should approve ✅
Test as Farm Manager: Should fail ❌
```

---

### Test 2: Large Expense Approval
```
Create decision:
- Type: approve_expense
- Amount: 12,000 SAR
- Expected required_roles: ['super_admin']
- Expected priority: urgent

Test as GM: Should approve ✅
Test as B2F Assistant: Should fail ❌
Test as Farm Manager: Should fail ❌
```

---

### Test 3: Task Submission Approval
```
Create decision:
- Type: approve_task_submission
- Expected required_roles: ['super_admin', 'farm_manager']

Test as GM: Should approve ✅
Test as Farm Manager (owner): Should approve ✅
Test as Farm Manager (other farm): Should fail ❌
```

---

### Test 4: Manager Change
```
Create decision:
- Type: change_farm_manager
- Expected required_roles: ['super_admin']
- Expected priority: high

Test as GM: Should approve ✅
Test as anyone else: Should fail ❌
```

---

### Test 5: Visit Request
```
Create decision:
- Type: request_visit
- Expected required_roles: ['super_admin', 'farm_manager']
- Expected priority: normal

Test as GM: Should approve ✅
Test as Farm Manager: Should approve ✅
```

---

## 🔧 Manual SQL Testing

### Create Test Expense Decision
```sql
SELECT * FROM create_expense_decision(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- farm_id
  gen_random_uuid(),                              -- expense_id (dummy)
  3500,                                           -- amount
  'شراء معدات ري',                               -- description
  current_staff_id()                              -- requested_by
);
```

### View All Pending Decisions
```sql
SELECT
  decision_type_ar,
  farm_name,
  expense_amount,
  priority_ar,
  hours_pending
FROM get_pending_b2f_decisions()
ORDER BY created_at DESC;
```

### Approve Decision
```sql
SELECT * FROM approve_b2f_decision(
  'decision-id-here'::uuid,
  current_staff_id(),
  'موافقة سريعة'
);
```

### Check Execution Result
```sql
-- For expense approval
SELECT approval_status, approved_by, approved_at
FROM farm_expenses
WHERE id = 'expense-id';

-- For task approval
SELECT status FROM farm_tasks WHERE id = 'task-id';

-- For manager change
SELECT farm_manager_id FROM b2f_farms WHERE id = 'farm-id';
```

---

## 🐛 Common Issues

### Issue 1: Decision not appearing

**Symptom:** Created decision but not in queue

**Check:**
```sql
SELECT farm_id, status FROM decision_queue WHERE id = 'decision-id';
```

**Fix:** Ensure `farm_id` is NOT NULL and `status = 'pending'`

---

### Issue 2: Permission denied

**Symptom:** "ليس لديك صلاحية"

**Check:**
```sql
-- Your role
SELECT role FROM platform_staff WHERE id = current_staff_id();

-- Required roles
SELECT required_roles FROM decision_queue WHERE id = 'decision-id';
```

**Fix:** Use account with correct role

---

### Issue 3: Approval not executing

**Symptom:** Approved but target not updated

**Check:**
```sql
-- Decision status
SELECT status, executed_at FROM decision_queue WHERE id = 'decision-id';

-- Executive log
SELECT * FROM executive_logs WHERE decision_id = 'decision-id';
```

**Fix:** Check action_data has correct IDs

---

## ✅ Acceptance Criteria

All must pass:

- [ ] **View Queue:** Can access Decision Queue from Farm Command
- [ ] **See Decisions:** Pending decisions display correctly
- [ ] **Priority Sorting:** Urgent decisions appear first
- [ ] **Approve Small Expense:** Assistant can approve < 5000 SAR
- [ ] **Approve Large Expense:** Only GM can approve >= 5000 SAR
- [ ] **Approve Task:** Farm manager can approve their farm's tasks
- [ ] **Approve Manager Change:** Only GM can approve
- [ ] **Approve Visit:** Farm manager can approve visits
- [ ] **Reject with Reason:** Can reject and must provide reason
- [ ] **Permission Block:** Unauthorized users get clear error
- [ ] **Execution:** Target tables update after approval
- [ ] **Audit Log:** All actions logged to executive_logs

---

## 📊 Performance Benchmarks

- **Queue Load Time:** < 1 second (for 20 decisions)
- **Approval Processing:** < 2 seconds
- **UI Responsiveness:** Instant feedback on actions
- **Database Query:** < 500ms for get_pending_b2f_decisions()

---

## 🎓 User Training Points

### For Approvers (GM, Assistants, Managers):

1. **Check Daily:** Decision Queue should be checked at least twice per day
2. **Priority First:** Always handle urgent decisions first (red badge)
3. **Read Notes:** Check requester notes before approving
4. **Rejection Reason:** Always provide clear reason when rejecting
5. **Farm Context:** Verify farm name before approving

### For Requesters:

1. **Clear Description:** Provide detailed description/justification
2. **Correct Amount:** Double-check amounts (typos cause delays)
3. **Right Type:** Choose correct decision type
4. **Follow Up:** Check decision status after 4 hours

---

## 📞 Support

**If you encounter issues:**

1. Check this guide's troubleshooting section
2. Run SQL debugging queries
3. Check browser console for errors (F12)
4. Verify user role and permissions
5. Contact system administrator

---

## 🔄 Next Steps After Testing

Once all tests pass:

1. ✅ Mark acceptance criteria complete
2. 📝 Document any issues found
3. 🎯 Train end users on workflow
4. 🚀 Deploy to production
5. 📊 Monitor metrics for first week
6. 💬 Gather user feedback
7. 🔧 Iterate and improve

---

**Version:** 1.0
**Date:** 2026-01-06
**Status:** Ready for Testing ✅
