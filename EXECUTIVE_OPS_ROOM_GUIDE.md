# دليل غرفة العمليات التنفيذية
# Executive Operations Room Guide

## نظرة عامة

غرفة العمليات التنفيذية هي **مركز القيادة والسيطرة** للمدير العام على المنصة. تم بناؤها وفق النموذج الرباعي الأعمدة:

1. **Owner of Record** - المسؤول الرسمي
2. **Pulse KPI** - المؤشرات الحية
3. **Decision Queue** - قائمة القرارات المعلقة
4. **Master Actions** - الإجراءات التنفيذية

---

## الوصول إلى النظام

### الرابط المباشر
```
/hq/executive-ops
```

### من لوحة HQ Dashboard
1. ادخل على `/hq`
2. ستجد بطاقة **غرفة العمليات التنفيذية** في أعلى الصفحة
3. اضغط عليها للدخول

---

## هيكل النظام

### 1. شاشة المدخل (Entry Screen)

تحتوي على بطاقتين رئيسيتين:

#### بطاقة B2F (استثمار المزارع)
- **نبض سريع**: الحجوزات اليوم، غير المعالج
- **تنبيه**: إذا كان هناك تنبيهات حرجة
- **المسؤول الرسمي**: اسم مساعد المدير العام لـ B2F
- **زر الدخول**: للوصول إلى الغرفة التفصيلية

#### بطاقة B2B (مزاد الشركات)
- **نبض سريع**: مزادات نشطة، تنتهي قريباً
- **تنبيه**: إذا كانت هناك مزادات حرجة
- **المسؤول الرسمي**: اسم مساعد المدير العام لـ B2B
- **زر الدخول**: للوصول إلى الغرفة التفصيلية

### 2. غرفة عمليات B2F

#### المؤشرات الحية (Pulse KPIs)
- عدد الحجوزات اليوم
- عدد الحجوزات غير المعالجة
- عدد المزارع غير الجاهزة (setup)
- عدد التنبيهات الحرجة

#### المسؤولين (Owners)
- مساعد المدير العام لـ B2F
- مدير المزارع الوطني

#### قائمة القرارات (Decision Queue)
القرارات التي تحتاج موافقة المدير العام:
- تغيير مدير مزرعة
- إيقاف مزرعة
- فتح حجوزات مزرعة
- اعتماد ميزانية كبيرة

**الإجراءات المتاحة**:
- اعتماد القرار (زر أخضر)
- رفض القرار (زر أحمر)

#### الإجراءات التنفيذية (Master Actions)
- تعيين مساعد مدير B2F
- تعيين مدير مزارع وطني
- قفل/فتح مزرعة
- تغيير مدير مزرعة
- اعتماد ميزانية مزرعة

### 3. غرفة عمليات B2B

#### المؤشرات الحية
- مزادات نشطة
- مزادات تنتهي قريباً (خلال ساعة)
- مزادات بدون مزايدات

#### المسؤول
- مساعد المدير العام لـ B2B

#### قائمة القرارات
- تمديد استثنائي لمزاد
- إلغاء نتيجة مزاد
- إيقاف مزاد
- اعتماد نتيجة مزاد

#### الإجراءات التنفيذية
- تعيين مساعد مدير B2B
- إيقاف/فتح مزاد
- تمديد وقت مزاد
- سحب مزاد من العرض العام

### 4. لوحة الصلاحيات (Authority Panel)

#### المسؤولين الحاليين
عرض قائمة كاملة بجميع المسؤولين الرسميين:
- مساعد مدير B2F
- مدير المزارع الوطني
- مساعد مدير B2B
- المحاسب الرئيسي
- مدير التسويق

**الإجراءات المتاحة**:
- تعيين مسؤول جديد
- تغيير مسؤول حالي
- سحب صلاحية مؤقتاً

#### السجل التنفيذي (Executive Log)
يعرض آخر 20 إجراء تنفيذي:
- نوع الإجراء
- من نفذ الإجراء
- الهدف
- النتيجة (نجح/فشل)
- التاريخ والوقت

---

## قاعدة البيانات

### الجداول الرئيسية

#### 1. executive_owners
يحفظ المسؤولين الرسميين عن كل قسم.

```sql
- owner_b2f: uuid
- owner_farm_command: uuid
- owner_b2b: uuid
- owner_finance: uuid
- owner_marketing: uuid
```

#### 2. executive_decision_queue
قائمة القرارات المعلقة.

```sql
- section: b2f | b2b | finance | marketing | platform
- decision_type: assign_owner | change_farm_manager | suspend_farm | etc.
- title: text
- description: text
- priority: low | medium | high | urgent | critical
- status: pending | approved | rejected | escalated | cancelled
```

#### 3. executive_actions_log
سجل كل الإجراءات التنفيذية.

```sql
- executed_by: uuid
- executor_name: text
- action_type: text
- target_type: staff | farm | auction | budget | decision
- target_id: uuid
- action_title: text
- result: success | failed | partial
```

#### 4. platform_kpis_realtime
المؤشرات الحية للمنصة.

```sql
- kpi_category: visits | bookings | auctions | finance | operations | alerts
- kpi_name: text
- kpi_value: numeric
- section: b2f | b2b | platform | finance | marketing
- period: realtime | today | this_week | this_month
```

#### 5. executive_master_actions
الإجراءات السريعة المتاحة.

```sql
- section: b2f | b2b | finance | marketing | platform | staff
- action_code: text (unique)
- action_name_ar: text
- action_name_en: text
- danger_level: low | medium | high | critical
- is_active: boolean
```

---

## الدوال (Functions)

### 1. get_executive_pulse_b2f()
يحسب المؤشرات الحية لقسم B2F.

**Returns**: jsonb
```json
{
  "bookings_today": 12,
  "bookings_unprocessed": 5,
  "farms_not_ready": 2,
  "critical_alerts": 1,
  "updated_at": "2026-01-05T10:00:00Z"
}
```

### 2. get_executive_pulse_b2b()
يحسب المؤشرات الحية لقسم B2B.

**Returns**: jsonb
```json
{
  "active_auctions": 8,
  "ending_soon": 2,
  "no_bids": 3,
  "updated_at": "2026-01-05T10:00:00Z"
}
```

### 3. get_executive_decision_queue(p_section, p_limit)
يجلب قائمة القرارات المعلقة مع الأولويات.

**Parameters**:
- `p_section`: text (optional) - 'b2f' | 'b2b' | null
- `p_limit`: integer (default: 50)

**Returns**: TABLE

### 4. assign_executive_owner(p_owner_type, p_staff_id, p_assigned_by)
تعيين مسؤول رسمي لقسم.

**Parameters**:
- `p_owner_type`: 'b2f' | 'farm_command' | 'b2b' | 'finance' | 'marketing'
- `p_staff_id`: uuid
- `p_assigned_by`: uuid

**Returns**: jsonb
```json
{
  "success": true,
  "owner_type": "b2f",
  "staff_id": "uuid",
  "staff_name": "أحمد محمد"
}
```

### 5. execute_master_action(p_action_code, p_executed_by, p_target_type, p_target_id, p_action_data)
تنفيذ إجراء تنفيذي مع تسجيله في السجل.

### 6. get_executive_owners()
جلب جميع المسؤولين الحاليين.

**Returns**: jsonb
```json
{
  "b2f": { "staff_id": "uuid", "name": "أحمد", "assigned_at": "..." },
  "farm_command": { "staff_id": "uuid", "name": "محمد", "assigned_at": "..." },
  "b2b": { "staff_id": "uuid", "name": "سارة", "assigned_at": "..." },
  "finance": { "staff_id": "uuid", "name": "علي", "assigned_at": "..." },
  "marketing": { "staff_id": "uuid", "name": "فاطمة", "assigned_at": "..." }
}
```

### 7. create_decision_request(p_section, p_decision_type, p_title, p_description, p_requested_by, p_priority, p_context)
إنشاء طلب قرار جديد.

### 8. decide_on_request(p_decision_id, p_decided_by, p_status, p_notes)
اعتماد أو رفض قرار معلق.

**Parameters**:
- `p_status`: 'approved' | 'rejected'

---

## الأمان (Security)

### RLS Policies

1. **executive_owners**: فقط Super Admin له الوصول الكامل
2. **executive_decision_queue**:
   - Super Admin: وصول كامل
   - المسؤولين: يمكنهم إضافة قرارات لأقسامهم ورؤيتها
3. **executive_actions_log**: للقراءة فقط - Super Admin
4. **platform_kpis_realtime**: الجميع يقرأ، النظام يكتب
5. **executive_master_actions**: الجميع يقرأ، Super Admin يدير

---

## سيناريوهات الاستخدام

### سيناريو 1: تعيين مساعد مدير B2F

1. المدير العام يدخل على **لوحة الصلاحيات**
2. يضغط على "تعيين مسؤول"
3. يختار المنصب: "مساعد مدير B2F"
4. يختار الموظف من القائمة
5. يضغط "تعيين"
6. النظام يسجل الإجراء في السجل التنفيذي

### سيناريو 2: اعتماد قرار إيقاف مزرعة

1. مدير المزارع الوطني يقدم طلب "إيقاف مزرعة X بسبب عطل"
2. الطلب يظهر في **قائمة القرارات** في غرفة B2F
3. المدير العام يراجع الطلب
4. يضغط "اعتماد" أو "رفض"
5. النظام يحدث حالة القرار ويسجل في السجل

### سيناريو 3: مراقبة المؤشرات الحية

1. المدير العام يدخل على شاشة المدخل
2. يرى بطاقة B2F تعرض:
   - "12 حجز اليوم"
   - "5 غير معالج"
   - تنبيه: "1 تنبيه حرج"
3. يضغط "دخول غرفة العمليات"
4. يرى التفاصيل الكاملة للمؤشرات والقرارات المعلقة

---

## الميزات المتقدمة

### 1. التحديث التلقائي
- المؤشرات الحية تتحدث كل 30 ثانية
- القرارات المعلقة تتحدث فور الاعتماد/الرفض

### 2. نظام الأولويات
القرارات مرتبة حسب الأولوية:
1. Critical (أحمر غامق)
2. Urgent (برتقالي)
3. High (كهرماني)
4. Medium (أزرق)
5. Low (رمادي)

### 3. السجل التنفيذي الشامل
كل إجراء يسجل مع:
- من نفذ
- ماذا نفذ
- على من/ماذا
- متى
- النتيجة

---

## الصيانة والتطوير

### إضافة قرار جديد

1. أضف نوع القرار في `decision_type` constraint:
```sql
ALTER TABLE executive_decision_queue
DROP CONSTRAINT IF EXISTS executive_decision_queue_decision_type_check;

ALTER TABLE executive_decision_queue
ADD CONSTRAINT executive_decision_queue_decision_type_check
CHECK (decision_type IN ('assign_owner', 'change_farm_manager', 'your_new_type', ...));
```

2. أضف معالجة القرار في الكود

### إضافة مؤشر جديد

1. أضف حساب المؤشر في الدالة المناسبة:
```sql
CREATE OR REPLACE FUNCTION get_executive_pulse_b2f()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_your_new_kpi integer;
BEGIN
  -- حساب المؤشر الجديد
  SELECT COUNT(*) INTO v_your_new_kpi FROM ...;

  -- إضافته للنتيجة
  v_result := jsonb_build_object(
    ...,
    'your_new_kpi', v_your_new_kpi
  );

  RETURN v_result;
END;
$$;
```

2. عرضه في الواجهة

---

## الخلاصة

غرفة العمليات التنفيذية توفر للمدير العام:

1. **رؤية شاملة** للمنصة بأكملها
2. **سيطرة كاملة** على القرارات الحرجة
3. **إدارة فعالة** للمسؤولين والصلاحيات
4. **شفافية تامة** من خلال السجل التنفيذي
5. **استجابة سريعة** للتنبيهات والأزمات

---

## الدعم الفني

للاستفسارات أو المشاكل:
- راجع السجل التنفيذي لمعرفة ما حدث
- تحقق من RLS policies إذا كان هناك مشكلة في الوصول
- راجع الدوال للتأكد من صحة الحسابات
