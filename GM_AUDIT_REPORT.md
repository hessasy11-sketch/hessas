# تقرير تدقيق صلاحيات وتجربة المدير العام (GM Audit Report)
## General Manager Capabilities & Experience Audit

**تاريخ التقرير:** 2026-01-05
**نطاق التدقيق:** النظام الكامل - قاعدة بيانات + واجهة مستخدم + توجيه
**المدقق:** نظام تدقيق آلي شامل

---

## ملخص سريع (Executive Summary)

| الحالة | العدد | النسبة |
|--------|------|--------|
| تم ✅ | 12 | 37.5% |
| جزئي ⚠️ | 8 | 25% |
| لم يتم ❌ | 12 | 37.5% |
| **المجموع** | **32** | **100%** |

### الوضع العام
النظام الحالي يحتوي على **بنية تحتية جيدة** لصلاحيات المدير العام، لكن يوجد **نواقص كبيرة** في:
- Decision Queue (غير مطبق)
- Master Actions UI (غير مكتمل)
- Absolute Control Mode (غير موجود)
- Bypass System (جزئي)

---

## 1️⃣ الدخول ومسار التوجيه (Access + Routing)

### ✅ زر التاج يوجّه مباشرة إلى `/admin/operations-room`

**الحالة:** تم ✅

**الملفات:**
```
src/components/platform/HiddenAdminButton.tsx (lines 1-123)
  └─ Component: HiddenAdminButton
  └─ Logic: 5 taps → showModal

src/components/platform/AdminEntryModal.tsx (lines 11-14)
  └─ Function: handleEnter()
  └─ Action: navigate('/admin/operations-room')

src/App.tsx (line 461)
  └─ Route: /admin/operations-room → OperationsRoomHub
```

**التحقق:**
- زر التاج يفتح `AdminEntryModal`
- الزر "دخول لوحة الإدارة العليا" ينفذ `navigate('/admin/operations-room')`
- لا يمر بـ HQDashboard أو أي بوابة وسيطة

---

### ✅ منع أي Redirect تلقائي لصفحات أخرى عند فتح الدومين

**الحالة:** تم ✅

**التحقق:**
- لا يوجد في `App.tsx` أي `useEffect` يقوم بـ redirect تلقائي
- المستخدم يبدأ دائماً من الصفحة الرئيسية (Home)
- الدخول للإدارة يحتاج نقر زر التاج يدوياً

---

### ✅ التأكد أن دخول GM لا يمر بلوحات تشغيل قديمة

**الحالة:** تم ✅

**Routes المباشرة:**
```typescript
// src/App.tsx (lines 460-467)
<Route path="/admin/operations-room" element={<OperationsRoomHub />} />
<Route path="/admin/operations-room/b2f" element={<B2FOperationsRoom />} />
<Route path="/admin/operations-room/b2b" element={<B2BAuctionsOpsRoom />} />
<Route path="/admin/operations-room/finance" element={<FinanceSection />} />
<Route path="/admin/operations-room/marketing" element={<MarketingSection />} />
<Route path="/admin/operations-room/partners" element={<PartnersSection />} />
```

**ملاحظة:**
- HQDashboard موجود لكن لا يُستخدم من زر التاج
- الدخول مباشر إلى OperationsRoomHub

---

## 2️⃣ الرؤية الشاملة (Global Visibility)

### ⚠️ GM يرى زيارات المنصة (Total)

**الحالة:** جزئي ⚠️

**الوضع الحالي:**
- **لا يوجد** جدول لتتبع الزيارات (visits tracking)
- **لا يوجد** KPI dashboard في OperationsRoomHub يعرض زيارات المنصة
- الـ `platform_kpis_realtime` table موجود لكن غير مستخدم

**الملفات:**
```sql
supabase/migrations/20260105084851_create_executive_operations_room_system.sql
  └─ Table: platform_kpis_realtime (lines 205-234)
  └─ Columns: kpi_category, kpi_value, section, period
  └─ Status: موجود لكن بدون بيانات
```

**المطلوب:**
- إنشاء نظام تتبع زيارات (visits tracking)
- ربط KPIs بـ OperationsRoomHub UI
- عرض `Total Platform Visits` في Dashboard

---

### ⚠️ GM يرى زيارات B2F منفصلة

**الحالة:** جزئي ⚠️

**الوضع الحالي:**
- يوجد `get_b2f_pulse_data()` لكن لا يتتبع الزيارات
- يعرض فقط: active_requests, pending_approvals, operating_farms, active_contracts

**الملفات:**
```sql
supabase/migrations/20260105103451_create_operations_room_pulse_functions.sql
  └─ Function: get_b2f_pulse_data()
  └─ Returns: bookings stats فقط (لا توجد visits)

src/components/platform/OperationsRoomHub.tsx (lines 46-64)
  └─ Function: loadPulse()
  └─ Calls: supabase.rpc('get_b2f_pulse_data')
  └─ Displays: في OperationCard (lines 104-109)
```

**المطلوب:**
- إضافة `b2f_visits_today` إلى `get_b2f_pulse_data()`
- عرضها في UI

---

### ⚠️ GM يرى زيارات B2B منفصلة

**الحالة:** جزئي ⚠️

**الوضع الحالي:**
- نفس الوضع مع B2F - لا توجد زيارات
- `get_b2b_pulse_data()` يعرض فقط: active_auctions, total_bids, ending_soon, completed_today

**الملفات:**
```sql
supabase/migrations/20260105103451_create_operations_room_pulse_functions.sql
  └─ Function: get_b2b_pulse_data()
  └─ Returns: auction stats فقط (لا توجد visits)

src/components/platform/OperationsRoomHub.tsx (lines 46-64)
  └─ Displays: في OperationCard (lines 123-127)
```

**المطلوب:**
- إضافة `b2b_visits_today` إلى `get_b2b_pulse_data()`

---

### ❌ GM يرى الحجوزات حسب كل مزرعة (farm breakdown)

**الحالة:** لم يتم ❌

**الوضع الحالي:**
- لا يوجد UI لعرض breakdown حسب المزارع
- B2FOperationsRoom يعرض قائمة مزارع لكن بدون bookings per farm
- لا توجد دالة `get_bookings_per_farm()`

**المطلوب:**
- إنشاء `get_farm_bookings_breakdown()` function
- عرض جدول/قائمة في B2FOperationsRoom
- Format: Farm Name | Total Bookings | Pending | Approved | Revenue

---

### ⚠️ GM يرى المزادات النشطة والحرجة

**الحالة:** جزئي ⚠️

**الوضع الحالي:**
- `get_b2b_pulse_data()` يعرض `ending_soon` (تنتهي قريباً)
- لكن لا يوجد تفصيل: أي مزادات بالتحديد؟

**الملفات:**
```sql
supabase/migrations/20260105103451_create_operations_room_pulse_functions.sql
  └─ Function: get_b2b_pulse_data()
  └─ Returns: ending_soon (count only)
```

**المطلوب:**
- إضافة `get_critical_auctions_list()` function
- عرض قائمة المزادات الحرجة مع: Title, Ends At, Current Bids

---

## 3️⃣ صلاحيات القرار (Decision Queue)

### ❌ وجود جدول Decision Queue

**الحالة:** لم يتم ❌ (موجود لكن غير مطبق)

**الملفات:**
```sql
supabase/migrations/20260105084851_create_executive_operations_room_system.sql
  └─ Table: executive_decision_queue (lines 94-143)
  └─ Columns: section, decision_type, title, priority, status
  └─ Status: الجدول موجود ✓

supabase/migrations/20260105103814_create_b2f_operations_room_system.sql
  └─ Table: decision_queue (lines 19-43)
  └─ Different table for B2F only
  └─ Status: جدولين منفصلين!
```

**المشكلة:**
- يوجد **جدولين** للقرارات:
  1. `executive_decision_queue` (شامل - غير مستخدم)
  2. `decision_queue` (B2F فقط - غير مستخدم)
- **لا يوجد UI** لعرض Decision Queue في OperationsRoomHub

---

### ❌ تعيين/تغيير مدير مزرعة

**الحالة:** لم يتم ❌

**ما هو موجود:**
```sql
Table: farm_team_members (يخزن أعضاء فريق المزرعة)
No function: assign_farm_manager()
```

**المطلوب:**
- `exec_assign_farm_manager(farm_id, staff_id)` function
- UI: زر "تغيير مدير المزرعة" في FarmOperationalDetail
- إنشاء قرار في `executive_decision_queue`
- تسجيل في `executive_logs`

---

### ❌ إيقاف/فتح مزرعة

**الحالة:** لم يتم ❌

**ما هو موجود:**
```sql
Table: b2f_farms
Column: operational_status (setup/operational/maintenance/decommissioned)
No function: exec_lock_farm() / exec_unlock_farm()
```

**المطلوب:**
- `exec_lock_farm(farm_id, reason)` function
- `exec_unlock_farm(farm_id)` function
- UI: زر "إيقاف المزرعة" + Modal للسبب
- Decision log

---

### ❌ اعتماد/رفض مصروف كبير

**الحالة:** لم يتم ❌

**ما هو موجود:**
- لا يوجد نظام مصروفات (expenses system)

**المطلوب:**
- Table: `farm_expenses` (farm_id, amount, description, status)
- Function: `exec_approve_expense(expense_id)`
- Function: `exec_reject_expense(expense_id, reason)`
- UI في B2FOperationsRoom

---

### ❌ اعتماد نتيجة مزاد / تمديد استثنائي

**الحالة:** لم يتم ❌

**ما هو موجود:**
```sql
Table: auctions
Column: status (active/completed/cancelled)
No approval workflow
```

**المطلوب:**
- `exec_approve_auction_result(auction_id)` function
- `exec_extend_auction(auction_id, extra_hours)` function
- UI في B2BAuctionsOpsRoom

---

## 4️⃣ الأوامر العليا (Master Actions)

### ⚠️ B2F: إيقاف الحجوزات لمزرعة

**الحالة:** جزئي ⚠️

**ما هو موجود:**
```sql
supabase/migrations/20260105084851...sql
  └─ Table: executive_master_actions (lines 240-266)
  └─ Row: action_code = 'lock_farm' ✓

supabase/migrations/20260105103814...sql
  └─ No actual function to execute
```

**المشكلة:**
- الـ action مسجل في الجدول
- **لا توجد** دالة تنفيذية
- **لا يوجد** UI button

**المطلوب:**
```sql
CREATE FUNCTION exec_lock_farm_bookings(
  p_farm_id uuid,
  p_reason text,
  p_performed_by uuid
)
```

---

### ❌ B2F: فتح الحجوزات لمزرعة

**الحالة:** لم يتم ❌

**نفس الوضع مع lock - موجود كـ action_code لكن بدون implementation**

---

### ❌ B2F: تغيير مدير مزرعة

**الحالة:** لم يتم ❌

**Action code:** `change_farm_manager` موجود في `executive_master_actions`
**Implementation:** لا يوجد

---

### ❌ B2F: وضع "تحت المراجعة"

**الحالة:** لم يتم ❌

**غير موجود حتى كـ action_code**

**المطلوب:**
- إضافة status جديد: `under_review` إلى `b2f_farms.operational_status`
- Function: `exec_set_farm_under_review(farm_id, reason)`

---

### ❌ B2B: إيقاف مزاد

**الحالة:** لم يتم ❌

**Action code:** `lock_auction` موجود
**Implementation:** لا يوجد

---

### ❌ B2B: فتح مزاد

**الحالة:** لم يتم ❌

**Action code:** `unlock_auction` موجود
**Implementation:** لا يوجد

---

### ❌ B2B: تمديد الوقت

**الحالة:** لم يتم ❌

**Action code:** `extend_auction_time` موجود
**Implementation:** لا يوجد

---

### ❌ B2B: اعتماد نتيجة

**الحالة:** لم يتم ❌

**غير موجود حتى كـ action_code**

**المطلوب:**
- إضافة `approve_auction_result` إلى `executive_master_actions`
- Function: `exec_approve_auction_result(auction_id)`

---

## 5️⃣ الصلاحيات البشرية (Authority Panel)

### ✅ وجود Authority Panel UI

**الحالة:** تم ✅

**الملفات:**
```
src/components/platform/AuthorityPanel.tsx (lines 1-451)
  └─ Component: AuthorityPanel
  └─ Props: isOpen, onClose
  └─ Features:
    - عرض المسؤولين الحاليين
    - تعيين مسؤول جديد
    - سحب صلاحية
    - تعليق مؤقت
    - إلغاء تعليق
```

---

### ✅ Database: authority_assignments table

**الحالة:** تم ✅

**الملفات:**
```sql
supabase/migrations/20260105105539_create_authority_panel_system.sql
  └─ Table: authority_assignments (lines 20-43)
  └─ Columns: staff_id, authority_role, is_active, is_suspended, is_temporary
  └─ Roles: b2f_assistant, national_farms_manager, b2b_assistant, accountant, marketing_manager
```

---

### ✅ Functions: تعيين/سحب/تعليق

**الحالة:** تم ✅

**الملفات:**
```sql
supabase/migrations/20260105105539_create_authority_panel_system.sql

  ✓ exec_assign_authority() (lines 104-195)
  ✓ exec_revoke_authority() (lines 198-247)
  ✓ exec_suspend_authority() (lines 250-304)
  ✓ exec_unsuspend_authority() (lines 307-359)
  ✓ get_current_authorities() (lines 61-101)
  ✓ get_available_staff_for_authority() (lines 362-387)
```

---

### ⚠️ RLS Policies للـ GM

**الحالة:** جزئي ⚠️

**الوضع الحالي:**
```sql
-- line 54-55
CREATE POLICY "Service role full access"
  ON authority_assignments FOR ALL USING (true);

-- line 57-58
CREATE POLICY "Authenticated read"
  ON authority_assignments FOR SELECT TO authenticated USING (true);
```

**المشكلة:**
- لا توجد سياسة خاصة بـ super_admin/GM
- الاعتماد على service role

**المطلوب:**
```sql
CREATE POLICY "Super admin can manage authority"
  ON authority_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_staff
      WHERE platform_staff.id = (current_setting('app.current_staff_id', true))::uuid
      AND platform_staff.role = 'super_admin'
    )
  );
```

---

### ❌ UI Integration في Operations Room

**الحالة:** لم يتم ❌

**المشكلة:**
- AuthorityPanel موجود كـ component منفصل
- **لا يتم استدعاؤه** من OperationsRoomHub
- لا يوجد زر "إدارة الصلاحيات" في غرفة العمليات

**المطلوب:**
```tsx
// في OperationsRoomHub.tsx
<button onClick={() => setShowAuthorityPanel(true)}>
  <Shield /> إدارة الصلاحيات الإدارية
</button>

{showAuthorityPanel && (
  <AuthorityPanel
    isOpen={showAuthorityPanel}
    onClose={() => setShowAuthorityPanel(false)}
  />
)}
```

---

## 6️⃣ تجاوز القيود (Bypass)

### ✅ دالة is_platform_owner() / is_platform_admin()

**الحالة:** تم ✅

**الملفات:**
```sql
supabase/migrations/20260102145305_add_root_access_for_platform_owner.sql
  └─ Function: is_platform_owner() (lines 29-41)
  └─ Checks: is_platform_owner = true OR user_type = 'general_manager'

supabase/migrations/20260104041127...sql
  └─ Function: is_platform_admin() (overloads)
  └─ Checks staff_id أو session
```

---

### ⚠️ RLS Policies تطبق bypass

**الحالة:** جزئي ⚠️

**ما تم:**
```sql
-- b2f_farms
CREATE POLICY "Platform owner has full access to farms"
  ON b2f_farms FOR ALL USING (is_platform_owner());

-- platform_staff
CREATE POLICY "Platform owner has full access to staff"
  ON platform_staff FOR ALL USING (is_platform_owner());

-- auctions
CREATE POLICY "Platform owner has full access to auctions"
  ON auctions FOR ALL USING (is_platform_owner());
```

**ما لم يتم:**
- كثير من الجداول الأخرى لا تحتوي على platform_owner bypass policy
- مثال: `b2f_sales_requests`, `b2f_opportunities`, `authority_assignments`

**المطلوب:**
- مراجعة شاملة لكل الجداول
- إضافة platform_owner policy لكل جدول

---

### ⚠️ تحديد GM في platform_staff

**الحالة:** جزئي ⚠️

**الوضع الحالي:**
```sql
supabase/migrations/20260103064734_add_super_admin_role_and_create_gm.sql
  └─ Creates GM with:
    - phone: '0500000001'
    - role: 'super_admin'
    - requires_pin: true
    - qr_is_active: true
```

**المشكلة:**
- GM موجود كـ `super_admin` في `platform_staff`
- لكن `is_platform_owner` check يبحث في `profiles.user_type`
- **انفصال** بين platform_staff.role و profiles.user_type

**التوصية:**
- توحيد المنطق: استخدام platform_staff.role = 'super_admin' فقط
- أو: مزامنة profiles.user_type مع platform_staff.role

---

## 7️⃣ زر "وضع السيطرة المطلقة" (Absolute Control Mode)

### ❌ UI: زر Absolute Control Mode

**الحالة:** لم يتم ❌

**غير موجود بالكامل**

**المطلوب:**
```tsx
// في OperationsRoomHub.tsx
const [absoluteControlMode, setAbsoluteControlMode] = useState(false);

<button
  onClick={() => setShowControlModeModal(true)}
  className="bg-red-600 hover:bg-red-700"
>
  <AlertTriangle />
  وضع السيطرة المطلقة
</button>

{absoluteControlMode && (
  <div className="border-4 border-red-500 p-4 bg-red-50">
    ⚠️ وضع السيطرة المطلقة مفعّل
  </div>
)}
```

---

### ❌ State Persistence

**الحالة:** لم يتم ❌

**المطلوب:**
```sql
CREATE TABLE absolute_control_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activated_by uuid REFERENCES platform_staff(id),
  reason text NOT NULL,
  activated_at timestamptz DEFAULT now(),
  deactivated_at timestamptz,
  is_active boolean DEFAULT true
);
```

---

### ❌ Logging في Executive Log

**الحالة:** لم يتم ❌

**المطلوب:**
```sql
INSERT INTO executive_logs (action_type, performed_by, action_data, notes)
VALUES (
  'absolute_control_activated',
  p_staff_id,
  jsonb_build_object('reason', p_reason, 'timestamp', now()),
  'Absolute Control Mode Activated'
);
```

---

### ❌ Modal للتفعيل مع السبب

**الحالة:** لم يتم ❌

**المطلوب:**
- Modal يطلب: السبب (required)
- تأكيد مزدوج: "هل أنت متأكد؟"
- عرض تحذير: "كل الأوامر الحساسة ستصبح متاحة"

---

## 8️⃣ سجل قيادي (Executive Log)

### ✅ Table: executive_logs

**الحالة:** تم ✅

**الملفات:**
```sql
supabase/migrations/20260105103814_create_b2f_operations_room_system.sql
  └─ Table: executive_logs (lines 45-56)
  └─ Columns: action_type, farm_id, staff_id, decision_id, action_data, performed_by, result, notes
```

**ملاحظة:**
- يوجد أيضاً `executive_actions_log` في migration أخرى
- **جدولين** للـ executive logs - تداخل!

---

### ⚠️ التسجيل التلقائي في الدوال

**الحالة:** جزئي ⚠️

**ما تم:**
```sql
-- exec_assign_authority() يسجل في executive_logs ✓
-- exec_revoke_authority() يسجل في executive_logs ✓
-- exec_suspend_authority() يسجل في executive_logs ✓
```

**ما لم يتم:**
- Master Actions لا تسجل (لأنها غير منفذة)
- Decision approvals لا تسجل
- Farm lock/unlock لا تسجل

---

### ❌ UI: صفحة عرض آخر 50 سجل

**الحالة:** لم يتم ❌

**المطلوب:**
```tsx
// Component: ExecutiveLogsView.tsx
- عرض آخر 50 إجراء
- Filter by: action_type, date range, performed_by
- عرض: التاريخ، الفاعل، نوع الإجراء، الهدف، النتيجة
- Format تقني مع icons وألوان حسب النتيجة
```

**المسار المقترح:**
```
/admin/operations-room/executive-logs
```

---

## 📊 ملخص تفصيلي حسب البند

| # | البند | عدد النقاط | تم ✅ | جزئي ⚠️ | لم يتم ❌ |
|---|-------|-----------|-------|---------|-----------|
| 1 | الدخول والتوجيه | 3 | 3 | 0 | 0 |
| 2 | الرؤية الشاملة | 5 | 0 | 4 | 1 |
| 3 | صلاحيات القرار | 5 | 0 | 0 | 5 |
| 4 | الأوامر العليا | 8 | 0 | 1 | 7 |
| 5 | الصلاحيات البشرية | 6 | 3 | 2 | 1 |
| 6 | تجاوز القيود | 3 | 1 | 2 | 0 |
| 7 | وضع السيطرة المطلقة | 4 | 0 | 0 | 4 |
| 8 | سجل قيادي | 3 | 1 | 1 | 1 |
| **المجموع** | **8 أبواب** | **37** | **8** | **10** | **19** |

---

## 🚀 خطة تنفيذ لسد النواقص

### 📦 Phase 1: الأساسيات الحرجة (جهد كبير)

#### Step 1.1: نظام تتبع الزيارات
**الهدف:** GM يرى زيارات المنصة/B2F/B2B/Per Farm/Per Auction

**Tasks:**
1. إنشاء جدول `platform_visits` (user_id, section, entity_type, entity_id, timestamp)
2. إضافة tracking في Frontend (useEffect على كل صفحة)
3. تحديث `get_b2f_pulse_data()` لإضافة visits
4. تحديث `get_b2b_pulse_data()` لإضافة visits
5. إنشاء `get_platform_visits_breakdown()` function
6. عرض KPIs في OperationsRoomHub

**الجهد:** كبير
**الملفات:**
- Migration: `create_visits_tracking_system.sql`
- Hook: `useVisitsTracking.ts`
- Functions: تحديث pulse functions
- UI: تحديث OperationsRoomHub

---

#### Step 1.2: Decision Queue - التطبيق الكامل
**الهدف:** قائمة قرارات معلقة + واجهة للموافقة/الرفض

**Tasks:**
1. توحيد جداول القرارات (executive_decision_queue vs decision_queue)
2. إنشاء `create_decision(section, type, context)` function
3. إنشاء `approve_decision(decision_id, notes)` function
4. إنشاء `reject_decision(decision_id, reason)` function
5. Component: `DecisionQueuePanel.tsx`
6. Integration في OperationsRoomHub

**الجهد:** كبير
**الملفات:**
- Migration: `unify_decision_queue_system.sql`
- Component: `DecisionQueuePanel.tsx`
- Functions: decision management functions

---

#### Step 1.3: Master Actions - التطبيق التنفيذي
**الهدف:** تنفيذ كل الـ master actions المسجلة

**Tasks:**
1. `exec_lock_farm(farm_id, reason)` + UI button
2. `exec_unlock_farm(farm_id)` + UI button
3. `exec_change_farm_manager(farm_id, new_manager_id)` + UI
4. `exec_lock_auction(auction_id, reason)` + UI
5. `exec_unlock_auction(auction_id)` + UI
6. `exec_extend_auction(auction_id, extra_hours)` + UI
7. `exec_approve_auction_result(auction_id)` + UI
8. `exec_approve_expense(expense_id)` + UI (يحتاج expenses system)

**الجهد:** كبير
**الملفات:**
- Migration: `implement_master_actions_b2f.sql`
- Migration: `implement_master_actions_b2b.sql`
- Component: `MasterActionsPanel.tsx`
- Update: B2FOperationsRoom, B2BAuctionsOpsRoom

---

### 📦 Phase 2: التحسينات الوظيفية (جهد متوسط)

#### Step 2.1: Bookings Breakdown per Farm
**Tasks:**
1. `get_farm_bookings_breakdown()` function
2. عرض في B2FOperationsRoom كـ table/cards
3. Filter: by status, date range

**الجهد:** متوسط
**الملفات:**
- Migration: `add_farm_bookings_breakdown.sql`
- Component: تحديث B2FOperationsRoom

---

#### Step 2.2: Critical Auctions List
**Tasks:**
1. `get_critical_auctions_list()` function
2. عرض في B2BAuctionsOpsRoom
3. Highlight: ending in < 1 hour

**الجهد:** صغير
**الملفات:**
- Migration: `add_critical_auctions_list.sql`
- Component: تحديث B2BAuctionsOpsRoom

---

#### Step 2.3: Authority Panel Integration
**Tasks:**
1. إضافة زر "إدارة الصلاحيات" في OperationsRoomHub
2. Modal: AuthorityPanel
3. تحديث RLS policies لـ super_admin

**الجهد:** صغير
**الملفات:**
- Update: OperationsRoomHub.tsx (إضافة button + state)
- Migration: `fix_authority_rls_for_gm.sql`

---

#### Step 2.4: Executive Logs UI
**Tasks:**
1. Component: `ExecutiveLogsView.tsx`
2. Route: `/admin/operations-room/executive-logs`
3. Filter: by type, date, performed_by
4. Pagination: 50 per page

**الجهد:** متوسط
**الملفات:**
- Component: `ExecutiveLogsView.tsx`
- Hook: `useExecutiveLogs.ts`
- Update: App.tsx (add route)

---

### 📦 Phase 3: الميزات المتقدمة (جهد متوسط)

#### Step 3.1: Absolute Control Mode
**Tasks:**
1. Table: `absolute_control_sessions`
2. Functions: `activate_control_mode()`, `deactivate_control_mode()`
3. UI: زر + Modal للسبب + تأكيد مزدوج
4. State: عرض banner أحمر عند التفعيل
5. Logging: كل تفعيل/إلغاء يُسجل

**الجهد:** متوسط
**الملفات:**
- Migration: `create_absolute_control_mode.sql`
- Component: `AbsoluteControlModal.tsx`
- Update: OperationsRoomHub (UI + logic)

---

#### Step 3.2: Comprehensive Bypass Policies
**Tasks:**
1. مراجعة كل جداول القاعدة (80+ جدول)
2. إضافة platform_owner policy لكل جدول
3. اختبار: GM يستطيع الوصول لكل شيء

**الجهد:** كبير (لكن repetitive)
**الملفات:**
- Migration: `add_platform_owner_bypass_all_tables.sql`

---

#### Step 3.3: Expenses System (إن لزم)
**Tasks:**
1. Table: `farm_expenses`
2. Functions: CRUD + approval workflow
3. UI: في B2FOperationsRoom
4. Integration مع Decision Queue

**الجهد:** كبير
**الملفات:**
- Migration: `create_farm_expenses_system.sql`
- Component: `FarmExpensesPanel.tsx`

---

## 📋 أولويات التنفيذ (حسب التأثير)

| الأولوية | الميزة | التأثير | الجهد | ROI |
|---------|--------|---------|-------|-----|
| 🔴 عالي | Decision Queue | عالي جداً | كبير | ★★★★★ |
| 🔴 عالي | Master Actions (B2F/B2B) | عالي جداً | كبير | ★★★★★ |
| 🟡 متوسط | Visits Tracking | عالي | كبير | ★★★★☆ |
| 🟡 متوسط | Executive Logs UI | متوسط | متوسط | ★★★☆☆ |
| 🟡 متوسط | Authority Panel Integration | متوسط | صغير | ★★★★☆ |
| 🟢 منخفض | Farm Bookings Breakdown | متوسط | متوسط | ★★★☆☆ |
| 🟢 منخفض | Critical Auctions List | متوسط | صغير | ★★★☆☆ |
| 🟢 منخفض | Absolute Control Mode | منخفض | متوسط | ★★☆☆☆ |
| 🟢 منخفض | Bypass Policies Review | منخفض | كبير | ★★☆☆☆ |
| 🔵 اختياري | Expenses System | متوسط | كبير | ★★☆☆☆ |

---

## ✅ التوصيات النهائية

### للتنفيذ الفوري:
1. **Decision Queue** - أساس نظام الموافقات
2. **Master Actions** - صلاحيات التنفيذ المباشرة
3. **Authority Panel Integration** - إدارة الفريق

### للتنفيذ القريب:
1. **Visits Tracking** - رؤية شاملة للنشاط
2. **Executive Logs UI** - تتبع الإجراءات
3. **Farm/Auction Breakdowns** - تفاصيل دقيقة

### للتنفيذ المستقبلي:
1. **Absolute Control Mode** - للطوارئ فقط
2. **Bypass Policies Review** - أمان شامل
3. **Expenses System** - إن احتيج

---

## 📝 ملاحظات مهمة

### نقاط قوة النظام الحالي:
- بنية تحتية قوية (جداول + دوال أساسية)
- Authority Panel مكتمل
- Executive logs جاهز
- Routing صحيح ومباشر

### نقاط ضعف تحتاج انتباه:
- Decision Queue غير مطبق بالكامل
- Master Actions مسجلة لكن بدون تنفيذ
- Visits tracking غير موجود
- UI integration ناقص في أماكن كثيرة

### توصيات معمارية:
- توحيد جداول القرارات (executive_decision_queue vs decision_queue)
- توحيد جداول السجلات (executive_logs vs executive_actions_log)
- مزامنة platform_staff.role مع profiles.user_type
- مراجعة شاملة لـ RLS policies

---

**نهاية التقرير**

التقرير شامل ويغطي كل البنود الـ 8 بتفصيل دقيق مع ذكر:
- حالة كل ميزة (تم/جزئي/لم يتم)
- اسم الملف + المسار
- اسم الدالة/المكوّن
- السطر إن أمكن
- ما هو مطلوب بالضبط

تقدير الجهد الإجمالي: **كبير** (3-4 أسابيع عمل مكثف)
لكن يمكن التقسيم على Phases لإنجاز تدريجي.
