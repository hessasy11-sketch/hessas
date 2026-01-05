# دليل غرف العمليات الشامل - المراحل C و D

## نظرة عامة

تم إنشاء نظام متكامل لغرف العمليات يشمل:
1. غرفة عمليات B2F (استثمار المزارع)
2. غرفة عمليات B2B (المزادات)

كلا الغرفتين تشتركان في:
- Decision Queue (طابور القرارات)
- Executive Log (السجل التنفيذي)
- نفس البنية المعمارية
- نفس معايير الأمان

---

## الوصول إلى غرف العمليات

### Hub الرئيسي
```
المسار: /admin/operations-room
أو: /hq
```

### غرفة B2F
```
المسار: /admin/operations-room/b2f
اللون: أخضر (emerald)
الأيقونة: ورقة شجر (Leaf)
```

### غرفة B2B
```
المسار: /admin/operations-room/b2b
اللون: أزرق (blue)
الأيقونة: مطرقة مزادات (Gavel)
```

---

## المقارنة الشاملة

### 1. Pulse (النبض)

#### B2F - استثمار المزارع
```typescript
{
  visits_today: number           // زيارات B2F اليوم
  bookings_today: number         // حجوزات اليوم
  farms_with_bookings: number    // مزارع عليها حجوزات
  overdue_requests: number       // طلبات متأخرة (+48 ساعة)
}
```

#### B2B - المزادات
```typescript
{
  visits_today: number           // زيارات B2B اليوم
  active_auctions: number        // مزادات نشطة
  critical_auctions: number      // مزادات حرجة (<24 ساعة)
  highest_bid_today: number      // أعلى عرض اليوم (ريال)
}
```

### 2. Radar (القائمة)

#### B2F - قائمة المزارع
```typescript
interface FarmRadar {
  id: string
  name: string
  location: string
  status: string                 // active | inactive
  bookings_enabled: boolean
  farm_manager_id: string | null
  farm_manager_name: string | null
  total_visits: number
  total_bookings: number
  pending_bookings: number
  last_booking_at: string | null
}
```

#### B2B - قائمة المزادات
```typescript
interface AuctionRadar {
  id: string
  title: string
  category_name: string
  status: string                 // active | pending | completed | sold | paused | cancelled
  current_price: number
  starting_price: number
  time_remaining_hours: number
  total_views: number
  total_bids: number
  highest_bid: number | null
  is_critical: boolean           // < 24 hours
  seller_name: string
}
```

### 3. Quick Actions

#### B2F - إجراءات المزارع
```sql
1. exec_toggle_farm_bookings()     -- تفعيل/إيقاف الحجوزات
2. exec_assign_farm_manager()      -- تعيين/تغيير المدير
3. exec_toggle_farm_status()       -- إيقاف/تشغيل المزرعة
```

#### B2B - إجراءات المزادات
```sql
1. exec_toggle_auction_status()    -- إيقاف/تفعيل/إلغاء المزاد
2. exec_extend_auction_time()      -- تمديد وقت المزاد
3. exec_approve_auction_result()   -- اعتماد نتيجة المزاد
```

### 4. Decision Queue (مشترك)

```sql
-- الجدول المشترك
decision_queue (
  id uuid
  decision_type text              -- نوع القرار (B2F أو B2B)
  farm_id uuid                    -- للمزارع
  target_staff_id uuid            -- للموظفين
  expense_amount numeric          -- للمصروفات
  action_data jsonb               -- بيانات إضافية
  status text                     -- pending | approved | rejected | executed
  priority text                   -- urgent | high | normal | low
  ...
)
```

**أنواع قرارات B2F:**
- assign_farm_manager
- change_farm_manager
- pause_farm
- activate_farm
- approve_expense
- toggle_bookings

**أنواع قرارات B2B:**
- pause_auction
- activate_auction
- extend_auction
- approve_auction_result
- cancel_auction

### 5. Executive Log (مشترك)

```sql
-- الجدول المشترك
executive_logs (
  id uuid
  action_type text                -- نوع الإجراء
  farm_id uuid                    -- للمزارع
  staff_id uuid                   -- للموظفين
  action_data jsonb               -- تفاصيل الإجراء
  performed_by uuid               -- من قام بالإجراء
  result text                     -- success | failure | partial
  ...
)
```

**إجراءات B2F المسجلة:**
- farm_manager_assigned
- farm_manager_changed
- farm_activated
- farm_paused
- expense_approved
- bookings_toggled

**إجراءات B2B المسجلة:**
- auction_activated
- auction_paused
- auction_cancelled
- auction_time_extended
- auction_result_approved

---

## البنية المعمارية

### Frontend

```
src/components/platform/
├── B2FOperationsRoom.tsx       # غرفة عمليات المزارع
├── B2BAuctionsOpsRoom.tsx      # غرفة عمليات المزادات
└── OperationsRoomHub.tsx       # Hub الرئيسي
```

### Backend

```
supabase/migrations/
├── create_b2f_operations_room_system.sql            # جداول B2F
├── create_b2f_operations_room_functions.sql         # دوال B2F
├── create_b2f_quick_actions_functions_v2.sql        # إجراءات B2F
└── create_b2b_operations_room_functions.sql         # دوال B2B
```

### الجداول المشتركة

```sql
decision_queue          -- طابور القرارات (مشترك)
executive_logs          -- السجل التنفيذي (مشترك)
```

### الجداول الخاصة

```sql
-- B2F
b2f_farms (
  + bookings_enabled boolean
  + farm_manager_id uuid
)

-- B2B
auctions (
  -- الجدول الموجود أصلاً
)
```

---

## الدوال الكاملة

### B2F Functions
```sql
-- Pulse & Radar
get_b2f_ops_pulse()
get_b2f_farms_radar()

-- Quick Actions
exec_toggle_farm_bookings(farm_id, enabled, by, notes)
exec_assign_farm_manager(farm_id, manager_id, by, notes)
exec_toggle_farm_status(farm_id, status, by, notes)

-- Decision Management
exec_approve_decision(decision_id, by, notes)
exec_reject_decision(decision_id, by, notes)

-- Logs
get_executive_logs(limit)
get_pending_decisions()
```

### B2B Functions
```sql
-- Pulse & Radar
get_b2b_ops_pulse()
get_b2b_auctions_radar()

-- Quick Actions
exec_toggle_auction_status(auction_id, status, by, notes)
exec_extend_auction_time(auction_id, hours, by, notes)
exec_approve_auction_result(auction_id, by, notes)

-- Decision Management (مشترك مع B2F)
exec_approve_decision(decision_id, by, notes)
exec_reject_decision(decision_id, by, notes)

-- Logs (مشترك مع B2F)
get_executive_logs(limit)
get_pending_decisions()
```

---

## التحديث التلقائي

كلا الغرفتين:
- تحديث تلقائي كل 30 ثانية
- استدعاء جميع الدوال في نفس الوقت
- تحديث الواجهة فوراً

```typescript
useEffect(() => {
  loadData();
  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## معايير الأمان

### RLS Policies
```sql
-- للجدولين المشتركين
ALTER TABLE decision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_logs ENABLE ROW LEVEL SECURITY;

-- Service role: صلاحيات كاملة
CREATE POLICY "Service role full access" ... USING (true);

-- Authenticated users: قراءة فقط
CREATE POLICY "Authenticated read" ... TO authenticated USING (true);
```

### التسجيل الإلزامي
- كل Quick Action يسجل تلقائياً
- لا يمكن تنفيذ إجراء بدون تسجيل
- معلومات كاملة لكل سجل

---

## المزايا العامة

### 1. التكامل
- نفس البنية المعمارية
- جداول مشتركة
- تصميم موحد
- تجربة مستخدم متسقة

### 2. الكفاءة
- تحديث تلقائي
- بيانات حية
- استجابة سريعة
- أداء عالي

### 3. الشفافية
- كل إجراء مسجل
- سجل تاريخي شامل
- معلومات مفصلة
- مراجعة سهلة

### 4. التحكم
- Quick Actions فورية
- Decision Queue منظم
- صلاحيات واضحة
- إدارة مركزية

### 5. الأمان
- RLS محكمة
- تسجيل إلزامي
- صلاحيات محددة
- تدقيق كامل

---

## سيناريوهات الاستخدام

### B2F - إدارة مزرعة

```
1. المدير يفتح غرفة B2F
2. يرى مزرعة عليها 15 حجز معلق
3. يضغط على المزرعة
4. يرى أن الحجوزات مفتوحة
5. قرار: إغلاق الحجوزات مؤقتاً
6. يضغط زر "حجوزات مغلقة"
7. يُسجل الإجراء تلقائياً
8. يظهر في Executive Log
```

### B2B - إدارة مزاد حرج

```
1. المدير يفتح غرفة B2B
2. يرى مزاد حرج (باقي 6 ساعات)
3. المزاد عليه 8 مزايدات نشطة
4. قرار: تمديد 24 ساعة
5. يضغط على المزاد
6. يضغط "تمديد 24س"
7. يُسجل الإجراء تلقائياً
8. الوقت المتبقي يتحدث فوراً
9. يظهر في Executive Log
```

### Decision Queue - معالجة قرار

```
1. موظف يطلب "تعيين مدير مزرعة"
2. يدخل القرار في Queue
3. المدير يفتح غرفة العمليات
4. يرى القرار في Decision Queue
5. يراجع التفاصيل
6. يضغط "موافقة"
7. ينفذ القرار تلقائياً
8. يُسجل في Executive Log
9. حالة القرار تصبح "executed"
```

---

## الإحصائيات والأرقام

### عدد الجداول
```
جداول مشتركة: 2 (decision_queue, executive_logs)
جداول B2F: 1 (b2f_farms - تعديلات)
جداول B2B: 0 (استخدام auctions الموجود)
المجموع: 3 جداول
```

### عدد الدوال
```
دوال B2F: 8
دوال B2B: 5
دوال مشتركة: 2
المجموع: 15 دالة
```

### عدد الملفات
```
Migrations: 4
Components: 3
المجموع: 7 ملفات
```

### أسطر الكود
```
B2FOperationsRoom.tsx: ~500 سطر
B2BAuctionsOpsRoom.tsx: ~550 سطر
Migrations: ~800 سطر
المجموع: ~1850 سطر
```

---

## الاختبارات

```bash
# Build Test
npm run build
# ✓ نجح بدون أخطاء

# TypeScript Check
npm run typecheck
# ✓ لا توجد أخطاء نوعية

# Lint Check
npm run lint
# ✓ الكود نظيف
```

---

## التوثيق

```
✓ B2F_OPERATIONS_ROOM_GUIDE.md          # دليل B2F مفصل
✓ B2B_AUCTIONS_OPS_ROOM_GUIDE.md       # دليل B2B مفصل
✓ OPERATIONS_ROOMS_COMPLETE_GUIDE.md   # دليل شامل (هذا الملف)
```

---

## نقاط القوة

### 1. البنية الموحدة
- كلا الغرفتين تشتركان في نفس البنية
- سهولة الصيانة
- سهولة إضافة غرف جديدة

### 2. إعادة الاستخدام
- جداول مشتركة
- دوال مشتركة
- مكونات قابلة لإعادة الاستخدام

### 3. القابلية للتوسع
- سهولة إضافة أنواع قرارات جديدة
- سهولة إضافة إجراءات جديدة
- البنية تدعم غرف عمليات إضافية

### 4. الأداء
- استعلامات محسّنة
- فهارس مناسبة
- تحديث تلقائي ذكي

### 5. الأمان
- RLS شاملة
- تسجيل إلزامي
- صلاحيات محددة

---

## التطوير المستقبلي

### غرف عمليات إضافية
```
✓ B2F - استثمار المزارع
✓ B2B - المزادات
⏳ Finance - المالية
⏳ Marketing - التسويق
⏳ Partners - الشركاء
```

### مزايا إضافية
- dashboard متقدم بالإحصائيات
- تقارير تحليلية
- تصدير البيانات
- نظام تنبيهات فورية
- دمج مع أنظمة خارجية

### تحسينات
- WebSocket للتحديث الفوري
- Cache ذكي
- Pagination للبيانات الكبيرة
- Filters متقدمة

---

## الملخص التنفيذي

تم إنشاء نظام متكامل لغرف العمليات يشمل:

### ✓ المراحل المكتملة
- [x] المرحلة C: غرفة عمليات B2F
- [x] المرحلة D: غرفة عمليات B2B

### ✓ المكونات الرئيسية
- [x] Pulse (نبض حي) لكلا الغرفتين
- [x] Radar (قوائم مفصلة) لكلا الغرفتين
- [x] Quick Actions (إجراءات سريعة) لكلا الغرفتين
- [x] Decision Queue (طابور قرارات مشترك)
- [x] Executive Log (سجل تنفيذي مشترك)

### ✓ المزايا الأساسية
- [x] تحديث تلقائي كل 30 ثانية
- [x] تسجيل إلزامي لكل إجراء
- [x] تنبيهات للحالات الحرجة
- [x] تصميم احترافي موحد
- [x] أمان شامل

### ✓ الاختبارات
- [x] Build نجح بدون أخطاء
- [x] TypeScript بدون مشاكل
- [x] التوثيق شامل

---

## الخاتمة

النظام جاهز للعمل بكامل طاقته ويوفر:
- **رؤية شاملة** لجميع العمليات
- **تحكم كامل** في المزارع والمزادات
- **شفافية عالية** مع التسجيل الإلزامي
- **كفاءة ممتازة** مع التحديث التلقائي
- **أمان محكم** مع RLS و Policies

المنصة الآن لديها نظام عمليات احترافي قابل للتوسع ومستعد لإدارة B2F و B2B بفعالية عالية!
