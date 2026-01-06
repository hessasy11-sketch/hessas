# Farm Command 2.0 - Phase 2: Auto Team Seeding System

## Overview

Phase 2 enhances the farm manager assignment system by automatically creating a structured team with vacant position seats when a manager is assigned. This introduces the concept of "position seats" separate from actual employee accounts, allowing for systematic team building.

## Key Concept: Position Seats vs. Employee Accounts

**Before Phase 2:**
- When assigning a farm manager, only the manager was recorded in `farm_team`
- No structured positions for team members
- Manual team building with no predefined structure

**After Phase 2:**
- When assigning a farm manager, system automatically creates 4-5 vacant position seats
- Clear separation: **Position Seat** (placeholder) vs **Employee Account** (actual person)
- Positions start as "vacant" and can be filled later
- Structured team hierarchy from day one

## Database Schema

### New Table: `farm_positions`

```sql
CREATE TABLE farm_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  position_key text NOT NULL CHECK (position_key IN (
    'field_supervisor',
    'agri_engineer',
    'technician',
    'worker',
    'factory_supervisor'
  )),
  title_ar text NOT NULL,
  title_en text NOT NULL,
  status text NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'assigned')),
  assigned_staff_id uuid REFERENCES platform_staff(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  notes text,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(farm_id, position_key)
);
```

### Position Keys

| Key | Title (AR) | Title (EN) | Created When | Required |
|-----|------------|------------|--------------|----------|
| `field_supervisor` | مشرف الحقل | Field Supervisor | Always | Yes |
| `agri_engineer` | مهندس زراعي | Agricultural Engineer | Always | Yes |
| `technician` | فني | Technician | Always | Yes |
| `worker` | عامل | Worker | Always | Yes |
| `factory_supervisor` | مشرف المصنع | Factory Supervisor | If `has_factory = true` | No |

## Database Functions

### 1. `seed_farm_positions(p_farm_id, p_has_factory)`

**Purpose:** Creates default vacant position seats for a farm

**Parameters:**
- `p_farm_id` (uuid): Farm ID
- `p_has_factory` (boolean): Whether to create factory supervisor position

**Returns:**
```json
{
  "success": true,
  "message_ar": "تم إنشاء المقاعد الوظيفية بنجاح",
  "message_en": "Position seats created successfully",
  "positions_created": 4,
  "farm_id": "uuid"
}
```

**Logic:**
1. Inserts 4 basic positions (field_supervisor, agri_engineer, technician, worker)
2. If `has_factory = true`, adds factory_supervisor position
3. Uses `ON CONFLICT DO NOTHING` to prevent duplicates
4. Returns count of positions created

### 2. `farm_command_assign_manager_v2(p_user_id, p_farm_id, p_new_manager_id)`

**Purpose:** Enhanced farm manager assignment with automatic team seeding

**Parameters:**
- `p_user_id` (uuid): Staff ID of user performing assignment (GM or National Manager)
- `p_farm_id` (uuid): Farm ID
- `p_new_manager_id` (uuid): Staff ID of new manager

**Returns:**
```json
{
  "success": true,
  "message_ar": "تم تعيين مدير المزرعة وإنشاء الفريق بنجاح",
  "message_en": "Farm manager assigned and team created successfully",
  "farm_id": "uuid",
  "farm_name": "مزرعة النخيل الشمالية",
  "new_manager_id": "uuid",
  "old_manager_id": "uuid",
  "team_seed_result": {
    "success": true,
    "positions_created": 4
  }
}
```

**Logic:**
1. **Permission Check:** Verify user is GM or National Manager
2. **Get Farm Details:** Retrieve farm name, has_factory, and current manager
3. **Deactivate Old Manager:** Set `is_active = false` in farm_team for old manager
4. **Update Farm:** Set new `farm_manager_id` in b2f_farms
5. **Add to Farm Team:** Insert/update new manager in farm_team
6. **Auto-Seed Team (NEW!):** Call `seed_farm_positions()` to create position seats
7. **Audit Log:** Record the operation with positions_created count

### 3. `get_farm_positions(p_farm_id)`

**Purpose:** Retrieve all position seats for a farm with assigned staff details

**Returns:**
```json
[
  {
    "id": "uuid",
    "position_key": "field_supervisor",
    "title_ar": "مشرف الحقل",
    "title_en": "Field Supervisor",
    "status": "vacant",
    "is_required": true,
    "assigned_staff_id": null,
    "assigned_staff_name": null,
    "assigned_staff_code": null,
    "assigned_at": null,
    "notes": null,
    "created_at": "2026-01-06T..."
  },
  // ... more positions
]
```

**Sorting:** Positions ordered by hierarchy (field_supervisor → agri_engineer → technician → worker → factory_supervisor)

### 4. `assign_staff_to_position(p_position_id, p_staff_id, p_assigned_by, p_notes)`

**Purpose:** Assign an employee to a vacant position seat

**Parameters:**
- `p_position_id` (uuid): Position seat ID
- `p_staff_id` (uuid): Staff member to assign
- `p_assigned_by` (uuid): User performing assignment
- `p_notes` (text): Optional notes

**Logic:**
1. Check position exists and is vacant
2. Update position: set assigned_staff_id, status='assigned', assigned_at=now()
3. Add staff to farm_team if not already there
4. Log operation in audit_logs

### 5. `remove_staff_from_position(p_position_id, p_removed_by, p_reason)`

**Purpose:** Remove an employee from a position seat (make it vacant again)

**Parameters:**
- `p_position_id` (uuid): Position seat ID
- `p_removed_by` (uuid): User performing removal
- `p_reason` (text): Optional reason

**Logic:**
1. Check position exists and is assigned
2. Update position: set assigned_staff_id=NULL, status='vacant'
3. Log operation with removed staff ID and reason

## Frontend Integration

### Updated Component: `AssignFarmManagerModal.tsx`

**Key Changes:**

1. **New Function Call:**
```typescript
// OLD (Phase 1)
await supabase.rpc('exec_assign_authority', {
  p_staff_id: selectedStaffId,
  p_authority_role: 'FARM_MANAGER',
  // ...
});

// NEW (Phase 2)
await supabase.rpc('farm_command_assign_manager_v2', {
  p_user_id: currentStaffId,
  p_farm_id: farm.id,
  p_new_manager_id: selectedStaffId
});
```

2. **Enhanced Success Message:**
- Changed from: "تم تعيين مدير المزرعة بنجاح"
- To: "تم تعيين مدير المزرعة وإنشاء هيكل الفريق تلقائياً"

3. **Info Box Update:**
Added note: "سيتم تلقائياً إنشاء هيكل الفريق (مشرف حقل، مهندس زراعي، فني، عامل) كمقاعد شاغرة يمكن ملؤها لاحقاً."

## User Flow

### Scenario: Assigning a Farm Manager

1. **Admin Opens Farm Command** (`/admin/b2f/farm-command`)
2. **Clicks Assign Manager** for a farm
3. **Chooses Assignment Method:**
   - Assign existing staff member
   - Invite new staff member
4. **Selects Staff Member** from dropdown
5. **Clicks "تعيين الآن"**
6. **System Automatically:**
   - ✅ Deactivates old manager (if exists)
   - ✅ Sets new farm_manager_id
   - ✅ Adds manager to farm_team
   - ✅ **Creates 4-5 vacant position seats**
   - ✅ Logs operation in audit_logs
7. **Success Message:** "تم تعيين مدير المزرعة وإنشاء هيكل الفريق تلقائياً"
8. **Page Refreshes** to show updated data

### Scenario: Viewing Farm Positions

1. **Farm Manager/Admin Views Farm Dashboard**
2. **Navigates to Team Tab**
3. **Sees Position Structure:**
   ```
   ┌─────────────────────────────────────┐
   │ مشرف الحقل         [فارغ]    [ملء] │
   │ مهندس زراعي        [فارغ]    [ملء] │
   │ فني               [فارغ]    [ملء] │
   │ عامل              [فارغ]    [ملء] │
   │ مشرف المصنع        [فارغ]    [ملء] │
   └─────────────────────────────────────┘
   ```
4. **Can Fill Positions** by assigning staff members

## Benefits

### 1. Structured Team Building
- Clear hierarchy from day one
- No guessing which positions are needed
- Consistent structure across all farms

### 2. Separation of Concerns
- **Position Seat:** The job role (placeholder)
- **Employee Account:** The person filling the role
- Easy to see vacant positions vs. filled positions

### 3. Future Planning
- Farm managers can see which positions need filling
- Executives can see team completion rate across farms
- Better workforce planning and hiring forecasts

### 4. Flexibility
- Positions can be filled gradually
- Staff can be reassigned between positions
- Easy to track team changes over time

### 5. Audit Trail
- Every position assignment is logged
- Clear record of who assigned whom and when
- Better accountability and transparency

## Security & Permissions

### RLS Policies for `farm_positions`

1. **SELECT (View Positions):**
   - GM and National Manager: Can view all positions
   - Farm Managers: Can view their farm's positions only

2. **INSERT/UPDATE/DELETE (Manage Positions):**
   - GM and National Manager: Full control
   - Farm Managers: Cannot modify positions (read-only)

### Function Permissions

All functions use `SECURITY DEFINER` and check permissions internally:
- `farm_command_assign_manager_v2`: Only GM and National Manager
- `assign_staff_to_position`: Only admins
- `remove_staff_from_position`: Only admins

## Testing Guide

### Test 1: Basic Assignment with Auto-Seed

**Steps:**
1. Login as GM
2. Navigate to `/admin/b2f/farm-command`
3. Click "تعيين مدير" for any farm without manager
4. Select existing staff member
5. Click "تعيين الآن"

**Expected Result:**
- ✅ Success message with "إنشاء هيكل الفريق"
- ✅ Page refreshes automatically
- ✅ Farm shows new manager in table
- ✅ In database: 4-5 new rows in `farm_positions` for this farm
- ✅ All positions have status='vacant'
- ✅ Audit log entry created

### Test 2: Factory Farm Gets Extra Position

**Steps:**
1. Create/select a farm with `has_factory = true`
2. Assign manager to this farm
3. Query `farm_positions` for this farm

**Expected Result:**
- ✅ 5 positions created (not 4)
- ✅ One position with position_key='factory_supervisor'
- ✅ factory_supervisor has is_required=false

### Test 3: Re-assigning Manager Doesn't Duplicate Positions

**Steps:**
1. Assign manager to farm (creates positions)
2. Re-assign a different manager to same farm
3. Query `farm_positions` count

**Expected Result:**
- ✅ Still only 4-5 positions (not 8-10)
- ✅ ON CONFLICT clause prevented duplicates
- ✅ Only manager changed, positions remain

### Test 4: View Positions via RPC

**SQL:**
```sql
SELECT * FROM get_farm_positions('farm-id-here');
```

**Expected Result:**
- ✅ Returns JSON array of positions
- ✅ Sorted by hierarchy
- ✅ Shows vacant status for all
- ✅ assigned_staff_* fields are null

### Test 5: Assign Staff to Position

**SQL:**
```sql
SELECT * FROM assign_staff_to_position(
  'position-id',
  'staff-id',
  'admin-id',
  'Test assignment'
);
```

**Expected Result:**
- ✅ Returns success=true
- ✅ Position status changes to 'assigned'
- ✅ assigned_staff_id filled
- ✅ assigned_at set to now()
- ✅ Staff added to farm_team if not there

## Migration File

**File:** `supabase/migrations/[timestamp]_add_auto_team_seeding_system.sql`

**Size:** ~350 lines

**Contents:**
1. CREATE TABLE farm_positions
2. CREATE INDEXES (2 indexes)
3. RLS POLICIES (3 policies)
4. FUNCTION seed_farm_positions
5. FUNCTION farm_command_assign_manager_v2
6. FUNCTION get_farm_positions
7. FUNCTION assign_staff_to_position
8. FUNCTION remove_staff_from_position
9. GRANT EXECUTE permissions

## Troubleshooting

### Issue: Positions Not Created

**Symptoms:**
- Manager assigned successfully
- But `farm_positions` table empty for farm

**Debug Steps:**
1. Check function return: `SELECT farm_command_assign_manager_v2(...)`
2. Look at `team_seed_result` in response
3. Check if farm_positions table exists: `\d farm_positions`
4. Verify RLS not blocking inserts

**Fix:**
- Ensure migration applied successfully
- Re-run migration if needed
- Check audit_logs for error details

### Issue: Duplicate Positions Error

**Symptoms:**
- Error: "duplicate key value violates unique constraint"

**Cause:**
- ON CONFLICT clause should prevent this
- But if constraint missing, duplicates possible

**Fix:**
```sql
-- Remove duplicates
DELETE FROM farm_positions a USING farm_positions b
WHERE a.id > b.id AND a.farm_id = b.farm_id AND a.position_key = b.position_key;
```

### Issue: Permission Denied

**Symptoms:**
- Error: "permission denied for function farm_command_assign_manager_v2"

**Fix:**
```sql
-- Grant execute permission
GRANT EXECUTE ON FUNCTION farm_command_assign_manager_v2 TO authenticated, anon;
```

## Performance Considerations

### Indexes

Two indexes created for optimal performance:

1. `idx_farm_positions_farm_id` - Fast lookup by farm
2. `idx_farm_positions_staff` - Fast lookup by assigned staff

### Query Optimization

- `get_farm_positions()` uses single JOIN query
- Results cached with jsonb_agg for efficiency
- COALESCE ensures empty array returned, not null

## Future Enhancements (Phase 3)

Potential features for next iteration:

1. **Position Templates:** Define custom position sets per farm type
2. **Bulk Assignment:** Assign multiple staff members at once
3. **Position Requirements:** Specify skills/certifications needed
4. **Auto-Suggestions:** Recommend staff for vacant positions
5. **Team Scorecard:** Calculate team completion percentage
6. **Position History:** Track all assignments over time

## Conclusion

Phase 2 successfully introduces structured team building with automatic position seeding. This provides a solid foundation for systematic farm team management while maintaining flexibility for future growth.

**Status:** ✅ Complete and Production-Ready

**Date:** 2026-01-06

**Build Status:** ✅ Successful (17.37s)

**Files Modified:**
- Database: 1 migration file
- Frontend: 1 component (AssignFarmManagerModal.tsx)
- Documentation: This file

**Next Steps:**
- Deploy to production
- Train users on new team structure
- Monitor audit logs for usage patterns
- Gather feedback for Phase 3 enhancements
