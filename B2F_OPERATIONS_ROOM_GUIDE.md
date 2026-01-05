# دليل غرفة عمليات B2F - المرحلة C

## نظرة عامة

تم بناء غرفة عمليات B2F كاملة مع جميع المكونات المطلوبة: Pulse، Radar، Quick Actions، Decision Queue، و Executive Log.

---

## المسار

```
/admin/operations-room/b2f
```

---

## المكونات الرئيسية

### 1. Pulse (النبض الحي)

**الموقع:** أعلى الصفحة

**البيانات المعروضة:**
```typescript
{
  visits_today: number          // زيارات B2F اليوم
  bookings_today: number        // حجوزات اليوم
  farms_with_bookings: number   // مزارع عليها حجوزات
  overdue_requests: number      // طلبات متأخرة (+48 ساعة)
}
```

**التحديث:** كل 30 ثانية تلقائياً

**الدالة:**
```sql
get_b2f_ops_pulse()
```

---

### 2. Radar - قائمة المزارع

**الموقع:** العمود الأيسر (الرئيسي)

**معلومات كل مزرعة:**
- الاسم والموقع
- الحالة (نشطة/متوقفة)
- حالة الحجوزات (مفتوحة/مغلقة)
- اسم مدير المزرعة
- عدد الزيارات
- عدد الحجوزات (الكلي والمعلق)
- تاريخ آخر حجز

**Quick Actions مباشرة:**
- تفعيل/إيقاف الحجوزات (زر سريع)
- التحديد للمزيد من الخيارات

**الدالة:**
```sql
get_b2f_farms_radar()
```

---

### 3. Quick Actions (للمدير العام)

**الإجراءات المتاحة:**

#### أ. تفعيل/إيقاف الحجوزات
```sql
exec_toggle_farm_bookings(
  p_farm_id: uuid,
  p_enabled: boolean,
  p_performed_by: uuid,
  p_notes: text
)
```

#### ب. تعيين/تغيير مدير المزرعة
```sql
exec_assign_farm_manager(
  p_farm_id: uuid,
  p_manager_id: uuid,
  p_performed_by: uuid,
  p_notes: text
)
```

#### ج. إيقاف/تشغيل المزرعة
```sql
exec_toggle_farm_status(
  p_farm_id: uuid,
  p_new_status: text,  -- 'active', 'inactive', 'suspended'
  p_performed_by: uuid,
  p_notes: text
)
```

**ميزة مهمة:** جميع الإجراءات تُسجل تلقائياً في Executive Log

---

### 4. Decision Queue (طابور القرارات)

**الموقع:** العمود الأيمن

**أنواع القرارات:**
1. تعيين مدير مزرعة (`assign_farm_manager`)
2. تغيير مدير مزرعة (`change_farm_manager`)
3. إيقاف مزرعة (`pause_farm`)
4. تشغيل مزرعة (`activate_farm`)
5. اعتماد مصروف كبير (`approve_expense`)
6. تفعيل/إيقاف حجوزات (`toggle_bookings`)

**مستويات الأولوية:**
- `urgent` - عاجل (أحمر)
- `high` - عالي (برتقالي)
- `normal` - عادي (أزرق)
- `low` - منخفض (رمادي)

**الحالات:**
- `pending` - معلق
- `approved` - موافق عليه
- `rejected` - مرفوض
- `executed` - منفذ

**إجراءات المدير:**
- موافقة (ينفذ القرار تلقائياً)
- رفض (يحفظ القرار كمرفوض)

**الدالة:**
```sql
get_pending_decisions()
```

**دوال التنفيذ:**
```sql
-- الموافقة
exec_approve_decision(
  p_decision_id: uuid,
  p_approved_by: uuid,
  p_notes: text
)

-- الرفض
exec_reject_decision(
  p_decision_id: uuid,
  p_rejected_by: uuid,
  p_notes: text
)
```

---

### 5. Executive Log (السجل التنفيذي)

**الموقع:** أسفل العمود الأيسر

**الإجراءات المسجلة:**
- `farm_manager_assigned` - تعيين مدير
- `farm_manager_changed` - تغيير مدير
- `farm_activated` - تشغيل مزرعة
- `farm_paused` - إيقاف مزرعة
- `expense_approved` - اعتماد مصروف
- `bookings_toggled` - تغيير حالة الحجوزات

**معلومات كل سجل:**
- نوع الإجراء
- اسم المزرعة
- الموظف المعني
- من قام بالإجراء
- النتيجة (نجاح/فشل)
- الملاحظات
- التاريخ والوقت

**الدالة:**
```sql
get_executive_logs(limit_count: integer)
```

**التسجيل التلقائي:** كل إجراء يُسجل إلزامياً

---

## قاعدة البيانات

### الجداول الجديدة

#### 1. decision_queue
```sql
CREATE TABLE decision_queue (
  id uuid PRIMARY KEY,
  decision_type text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id),
  target_staff_id uuid REFERENCES platform_staff(id),
  expense_amount numeric(12, 2),
  expense_description text,
  action_data jsonb,
  status text DEFAULT 'pending',
  priority text DEFAULT 'normal',
  requested_by uuid,
  approved_by uuid,
  executed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 2. executive_logs
```sql
CREATE TABLE executive_logs (
  id uuid PRIMARY KEY,
  action_type text NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id),
  staff_id uuid REFERENCES platform_staff(id),
  decision_id uuid REFERENCES decision_queue(id),
  action_data jsonb,
  performed_by uuid,
  result text DEFAULT 'success',
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### الحقول الإضافية للمزارع

```sql
-- في جدول b2f_farms
ALTER TABLE b2f_farms
ADD COLUMN bookings_enabled boolean DEFAULT true;

ALTER TABLE b2f_farms
ADD COLUMN farm_manager_id uuid REFERENCES platform_staff(id);
```

---

## الاستخدام

### 1. فتح غرفة العمليات
```
المسار: /admin/operations-room
→ اضغط على بطاقة "استثمار المزارع"
→ يفتح: /admin/operations-room/b2f
```

### 2. مراقبة النبض
- راقب الأرقام في الأعلى
- الطلبات المتأخرة تظهر بلون أحمر
- التحديث التلقائي كل 30 ثانية

### 3. إدارة المزارع
- استعرض قائمة المزارع في Radar
- افتح/أغلق الحجوزات مباشرة
- اضغط على المزرعة لاختيارها

### 4. معالجة القرارات
- راجع القرارات المعلقة
- افحص الأولوية والتفاصيل
- اضغط "موافقة" للتنفيذ
- اضغط "رفض" للرفض

### 5. مراجعة السجل
- راجع آخر الإجراءات
- تحقق من النتائج
- اقرأ الملاحظات

---

## الأمان

### RLS Policies
- جميع الجداول محمية بـ RLS
- Service role له صلاحيات كاملة
- المستخدمون المصادق عليهم لهم صلاحية قراءة فقط
- التنفيذ يتطلب مصادقة

### التسجيل الإلزامي
- كل إجراء يُسجل تلقائياً
- لا يمكن حذف السجلات
- معلومات كاملة لكل إجراء

---

## المزايا

### 1. الشفافية الكاملة
- كل إجراء مسجل
- معلومات واضحة لكل قرار
- سجل تاريخي شامل

### 2. الكفاءة
- بيانات حية
- إجراءات سريعة
- تحديث تلقائي

### 3. التحكم الكامل
- موافقة أو رفض القرارات
- إجراءات سريعة للمدير
- مراقبة شاملة

### 4. التصميم الاحترافي
- واجهة واضحة
- ألوان مميزة
- سهولة الاستخدام

---

## الملفات المنفذة

### Frontend
```
src/components/platform/B2FOperationsRoom.tsx
```

### Backend (Migrations)
```
supabase/migrations/create_b2f_operations_room_system.sql
supabase/migrations/create_b2f_operations_room_functions.sql
supabase/migrations/create_b2f_quick_actions_functions_v2.sql
```

### Routes
```typescript
// في App.tsx
<Route path="/admin/operations-room/b2f" element={<B2FOperationsRoom />} />
```

---

## الاختبار

```bash
npm run build
# ✓ Build نجح بدون أخطاء
```

---

## ملاحظات مهمة

1. التحديث التلقائي كل 30 ثانية
2. جميع الإجراءات تُسجل إلزامياً
3. Quick Actions للمدير العام فقط (حالياً)
4. القرارات مرتبة حسب الأولوية
5. الطلبات المتأخرة (+48 ساعة) تظهر كتنبيه

---

## التطوير المستقبلي

- إضافة صلاحيات متقدمة للموظفين
- نظام إشعارات للقرارات الجديدة
- تقارير تحليلية
- تصدير السجلات
- dashboard للإحصائيات المتقدمة

---

## الخلاصة

تم إنشاء غرفة عمليات B2F كاملة مع:
- ✓ Pulse حي (4 أرقام)
- ✓ Radar قائمة المزارع
- ✓ Quick Actions للمدير
- ✓ Decision Queue
- ✓ Executive Log إلزامي
- ✓ تحديث تلقائي
- ✓ تصميم احترافي
- ✓ أمان شامل
