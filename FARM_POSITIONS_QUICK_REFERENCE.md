# Farm Positions System - Quick Reference Guide

## 🎯 Quick Overview

**What:** Position management system for farms
**Where:** `/admin/b2f/farms/:farmId` → "الإدارة والفريق" tab
**Who:** Farm managers can assign staff to positions
**Status:** ✅ Production Ready (Phase 3 Complete)

---

## 📊 Database Tables

### `farm_positions`
Created by Phase 2 auto-seeding. Contains position "seats" (placeholders).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| farm_id | uuid | Reference to b2f_farms |
| position_key | text | field_supervisor, agri_engineer, technician, worker, factory_supervisor |
| title_ar | text | Arabic position title |
| title_en | text | English position title |
| status | text | vacant \| assigned |
| assigned_staff_id | uuid | Reference to platform_staff (nullable) |
| assigned_at | timestamptz | When staff was assigned (nullable) |
| notes | text | Assignment notes (nullable) |
| is_required | boolean | Whether position is mandatory |

**Key Index:** `(farm_id, position_key)` UNIQUE

---

### `staff_requests`
Created by Phase 3. Tracks requests for new staff accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| farm_id | uuid | Reference to b2f_farms |
| position_id | uuid | Reference to farm_positions |
| requested_role | text | Role being requested |
| position_title_ar | text | Position title (AR) |
| position_title_en | text | Position title (EN) |
| requested_by_staff_id | uuid | Who created the request |
| notes | text | Justification for request |
| status | text | pending \| approved \| rejected \| cancelled |
| approved_by | uuid | Who approved/rejected (nullable) |
| approved_at | timestamptz | When approved/rejected (nullable) |
| rejection_reason | text | Why rejected (nullable) |

**Constraint:** Only one pending request per position at a time

---

## 🔧 RPC Functions

### 1. `get_farm_positions(farm_id)`
Returns all positions for a farm with assigned staff details.

**Usage:**
```typescript
const { data } = await supabase.rpc('get_farm_positions', {
  p_farm_id: farmId
});
```

**Returns:** Array of positions with staff info:
```typescript
{
  id: string;
  position_key: string;
  title_ar: string;
  title_en: string;
  status: 'vacant' | 'assigned';
  is_required: boolean;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  assigned_staff_code: string | null;
  assigned_at: string | null;
  notes: string | null;
  created_at: string;
}[]
```

---

### 2. `get_available_staff_for_position(farm_id, position_key)`
Returns staff NOT already assigned to positions on this farm.

**Usage:**
```typescript
const { data } = await supabase.rpc('get_available_staff_for_position', {
  p_farm_id: farmId,
  p_position_key: 'field_supervisor'
});
```

**Returns:** Array of available staff:
```typescript
{
  id: string;
  full_name: string;
  staff_code: string;
  role: string;
  department: string;
}[]
```

---

### 3. `assign_existing_staff_to_position(position_id, staff_id, assigned_by, notes?)`
Assigns staff to position and updates farm_team.

**Usage:**
```typescript
const { data } = await supabase.rpc('assign_existing_staff_to_position', {
  p_position_id: positionId,
  p_staff_id: staffId,
  p_assigned_by_staff_id: currentStaffId,
  p_notes: 'Optional notes'
});
```

**Logic:**
1. Checks position is vacant
2. Updates farm_positions (status='assigned', assigned_staff_id)
3. Determines farm_team role based on position_key:
   - field_supervisor → 'field_supervisor'
   - factory_supervisor → 'factory_supervisor'
   - others → 'team_member'
4. Inserts/updates farm_team entry
5. Logs to audit_logs

**Returns:**
```typescript
{
  success: boolean;
  message_ar: string;
  message_en?: string;
}
```

---

### 4. `unassign_staff_from_position(position_id, unassigned_by, reason?)`
Removes staff from position (makes it vacant).

**Usage:**
```typescript
const { data } = await supabase.rpc('unassign_staff_from_position', {
  p_position_id: positionId,
  p_unassigned_by_staff_id: currentStaffId,
  p_reason: 'Transferred to another farm'
});
```

**Logic:**
1. Checks position is assigned
2. Clears assigned_staff_id (status='vacant')
3. Does NOT remove from farm_team (staff might have other positions)
4. Logs to audit_logs

---

### 5. `create_staff_request(farm_id, position_id, requested_by, notes)`
Creates request for new staff account.

**Usage:**
```typescript
const { data } = await supabase.rpc('create_staff_request', {
  p_farm_id: farmId,
  p_position_id: positionId,
  p_requested_by_staff_id: currentStaffId,
  p_notes: 'Need experienced irrigation technician'
});
```

**Logic:**
1. Checks no existing pending request for this position
2. Gets position details (titles)
3. Inserts staff_requests row (status='pending')
4. Logs to audit_logs

**Returns:**
```typescript
{
  success: boolean;
  message_ar: string;
  request_id?: string;
}
```

---

### 6. `get_farm_staff_requests(farm_id, status_filter?)`
Gets farm's staff requests (filtered by status).

**Usage:**
```typescript
const { data } = await supabase.rpc('get_farm_staff_requests', {
  p_farm_id: farmId,
  p_status_filter: 'pending' // or 'all'
});
```

**Returns:** Array of requests with details:
```typescript
{
  id: string;
  position_title_ar: string;
  position_title_en: string;
  notes: string;
  status: string;
  requested_by_name: string;
  created_at: string;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
}[]
```

---

### 7. `approve_staff_request(request_id, approved_by, approved, rejection_reason?)`
Approves or rejects a staff request. **GM only** (not yet UI-accessible).

**Usage:**
```typescript
// Approve
const { data } = await supabase.rpc('approve_staff_request', {
  p_request_id: requestId,
  p_approved_by_staff_id: gmStaffId,
  p_approved: true,
  p_rejection_reason: null
});

// Reject
const { data } = await supabase.rpc('approve_staff_request', {
  p_request_id: requestId,
  p_approved_by_staff_id: gmStaffId,
  p_approved: false,
  p_rejection_reason: 'Not enough budget'
});
```

**Returns:**
```typescript
{
  success: boolean;
  message_ar: string;
}
```

**Note:** Phase 4 will add UI for this function.

---

## 🎨 Frontend Component

### `FarmPositionsManagement.tsx`
Main component for position management UI.

**Location:** `src/components/platform/FarmPositionsManagement.tsx`

**Props:**
```typescript
interface FarmPositionsManagementProps {
  farmId: string;
  farmName: string;
}
```

**Key State:**
```typescript
const [positions, setPositions] = useState<FarmPosition[]>([]);
const [requests, setRequests] = useState<StaffRequest[]>([]);
const [showAssignModal, setShowAssignModal] = useState(false);
const [showRequestModal, setShowRequestModal] = useState(false);
const [selectedPosition, setSelectedPosition] = useState<FarmPosition | null>(null);
const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
```

**Key Functions:**
- `loadPositionsData()` - Loads positions and pending requests
- `handleOpenAssignModal(position)` - Opens assign modal, loads available staff
- `handleAssignStaff()` - Calls assign RPC, reloads data
- `handleUnassignStaff(positionId)` - Calls unassign RPC, reloads data
- `handleOpenRequestModal(position)` - Opens request modal
- `handleCreateRequest()` - Calls create_staff_request RPC, reloads data

**Visual States:**
- **Vacant:** Gray card, two action buttons
- **Assigned:** Green card, staff info, unassign button
- **Pending Request:** Amber card, request info, no actions

---

## 🔒 Permissions

### RLS Policies on `staff_requests`

1. **SELECT (View Requests):**
   - Admins: View all
   - Farm managers: View their farm's requests only

2. **INSERT (Create Requests):**
   - Farm managers: Can create for their farms
   - Admins: Can create for any farm

3. **UPDATE (Approve/Reject):**
   - GM only via function (policy allows function SECURITY DEFINER)

4. **DELETE:**
   - GM only

### Function Permission Checks

Functions use `SECURITY DEFINER` but check permissions internally:

```sql
-- Example from assign_existing_staff_to_position
SELECT role INTO v_assigner_role
FROM platform_staff
WHERE id = p_assigned_by_staff_id;

-- Allow if GM, National Manager, or Farm Manager of this farm
IF v_assigner_role NOT IN ('general_manager', 'national_farm_manager') THEN
  -- Check if farm manager of this specific farm
  SELECT farm_manager_id INTO v_farm_manager_id
  FROM b2f_farms WHERE id = v_farm_id;

  IF v_farm_manager_id != p_assigned_by_staff_id THEN
    RETURN jsonb_build_object('success', false, 'message_ar', 'غير مصرح');
  END IF;
END IF;
```

---

## 🐛 Common Issues & Fixes

### Issue: "تعيين الآن" button does nothing

**Cause:** Missing `current_staff_id` in sessionStorage

**Fix:**
```typescript
// Ensure staff is logged in and session set
const currentStaffId = sessionStorage.getItem('current_staff_id');
if (!currentStaffId) {
  alert('الرجاء تسجيل الدخول أولاً');
  return;
}
```

---

### Issue: Dropdown shows no available staff

**Cause:** All staff already assigned to positions on this farm

**Solutions:**
1. Request new staff account (use request modal)
2. Unassign staff from other positions first
3. Check if staff exist in system at all

**Debug:**
```sql
-- Check total staff in system
SELECT COUNT(*) FROM platform_staff WHERE is_active = true;

-- Check staff already on this farm
SELECT assigned_staff_id FROM farm_positions
WHERE farm_id = 'farm-id' AND assigned_staff_id IS NOT NULL;

-- Manually test function
SELECT * FROM get_available_staff_for_position('farm-id', 'worker');
```

---

### Issue: Position shows "معيّن" but no staff name

**Cause:** Data inconsistency - assigned_staff_id set but staff deleted

**Fix:**
```sql
-- Find orphaned assignments
SELECT fp.id, fp.farm_id, fp.assigned_staff_id
FROM farm_positions fp
WHERE fp.status = 'assigned'
  AND NOT EXISTS (
    SELECT 1 FROM platform_staff ps WHERE ps.id = fp.assigned_staff_id
  );

-- Clear orphaned assignments
UPDATE farm_positions
SET status = 'vacant', assigned_staff_id = NULL
WHERE id = 'position-id';
```

---

### Issue: Request created but not showing in count

**Cause:** Status not 'pending' or RLS blocking query

**Fix:**
```sql
-- Check all requests for farm (bypass RLS if needed)
SELECT * FROM staff_requests WHERE farm_id = 'farm-id';

-- If exists but not showing, check status
UPDATE staff_requests SET status = 'pending' WHERE id = 'request-id';
```

---

## 📝 Code Snippets

### Assign Staff to Position (Complete Flow)
```typescript
const assignStaffToPosition = async (positionId: string, staffId: string) => {
  try {
    const currentStaffId = sessionStorage.getItem('current_staff_id');
    if (!currentStaffId) throw new Error('Not logged in');

    const { data, error } = await supabase.rpc('assign_existing_staff_to_position', {
      p_position_id: positionId,
      p_staff_id: staffId,
      p_assigned_by_staff_id: currentStaffId,
      p_notes: 'Assigned via UI'
    });

    if (error) throw error;

    if (data?.success) {
      alert(data.message_ar);
      // Reload positions data
      await loadPositionsData();
    } else {
      alert(data?.message_ar || 'حدث خطأ');
    }
  } catch (err) {
    console.error('Assignment error:', err);
    alert('فشل التعيين');
  }
};
```

---

### Create Staff Request (Complete Flow)
```typescript
const createStaffRequest = async (positionId: string, notes: string) => {
  try {
    const currentStaffId = sessionStorage.getItem('current_staff_id');
    if (!currentStaffId) throw new Error('Not logged in');

    const { data, error } = await supabase.rpc('create_staff_request', {
      p_farm_id: farmId,
      p_position_id: positionId,
      p_requested_by_staff_id: currentStaffId,
      p_notes: notes
    });

    if (error) throw error;

    if (data?.success) {
      alert(data.message_ar);
      // Reload positions and requests
      await loadPositionsData();
    } else {
      alert(data?.message_ar || 'فشل إرسال الطلب');
    }
  } catch (err) {
    console.error('Request error:', err);
    alert('فشل إرسال الطلب');
  }
};
```

---

### Load Positions with Requests Count
```typescript
const loadPositionsData = async () => {
  setLoading(true);
  try {
    // Load positions
    const { data: positionsData, error: posError } = await supabase.rpc('get_farm_positions', {
      p_farm_id: farmId
    });
    if (posError) throw posError;
    if (positionsData) setPositions(positionsData);

    // Load pending requests count
    const { data: requestsData, error: reqError } = await supabase.rpc('get_farm_staff_requests', {
      p_farm_id: farmId,
      p_status_filter: 'pending'
    });
    if (reqError) throw reqError;
    if (requestsData) setRequests(requestsData);
  } catch (err) {
    console.error('Load error:', err);
  } finally {
    setLoading(false);
  }
};
```

---

## 🎯 Position Icons Reference

| Position Key | Icon | AR Title | EN Title |
|--------------|------|----------|----------|
| field_supervisor | 👨‍🌾 | مشرف الحقل | Field Supervisor |
| agri_engineer | 👨‍🔬 | مهندس زراعي | Agricultural Engineer |
| technician | 🔧 | فني | Technician |
| worker | 👷 | عامل | Worker |
| factory_supervisor | 🏭 | مشرف المصنع | Factory Supervisor |

---

## 🔍 SQL Query Cheat Sheet

```sql
-- Get all positions for a farm
SELECT * FROM get_farm_positions('farm-id');

-- Get available staff for assignment
SELECT * FROM get_available_staff_for_position('farm-id', 'worker');

-- Check position status
SELECT position_key, status, assigned_staff_id, assigned_at
FROM farm_positions
WHERE farm_id = 'farm-id';

-- Check pending requests
SELECT * FROM staff_requests
WHERE farm_id = 'farm-id' AND status = 'pending';

-- Check farm_team after assignment
SELECT ft.role, ps.full_name, ps.staff_code
FROM farm_team ft
JOIN platform_staff ps ON ft.user_id = ps.user_id
WHERE ft.farm_id = 'farm-id' AND ft.is_active = true;

-- Check recent audit logs
SELECT action, target_type, performed_by, details
FROM audit_logs
WHERE target_type IN ('farm_position', 'staff_request')
ORDER BY created_at DESC LIMIT 20;

-- Manual approve request (GM only)
SELECT * FROM approve_staff_request(
  'request-id',
  'gm-staff-id',
  true,  -- approve
  NULL   -- no rejection reason
);
```

---

## 📚 Related Documentation

- `FARM_COMMAND_PHASE1_COMPLETE.md` - Farm Command Center
- `FARM_COMMAND_PHASE2_AUTO_TEAM_SEED.md` - Auto Team Seeding
- `FARM_POSITIONS_PHASE3_TESTING.md` - Comprehensive Testing Guide
- `FARM_COMMAND_PHASE3_COMPLETE.md` - Full Phase 3 Documentation

---

## 🚀 Quick Start for Developers

1. **Understand the flow:**
   - Phase 2 creates positions → Phase 3 fills positions

2. **Key files:**
   - Database: `supabase/migrations/*_create_farm_team_positions_management.sql`
   - Frontend: `src/components/platform/FarmPositionsManagement.tsx`
   - Integration: `src/components/platform/FarmDetailPage.tsx`

3. **Test locally:**
   - Assign manager to farm (Phase 2)
   - Navigate to farm dashboard
   - Click "الإدارة والفريق" tab
   - Try assigning staff and creating requests

4. **Debug with:**
   - Browser console for errors
   - Supabase logs for RPC function errors
   - `audit_logs` table for operation history

---

**Last Updated:** 2026-01-06
**Status:** Production Ready ✅
**Version:** 3.0
