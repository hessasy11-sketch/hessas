# المرحلة 2: نظام مهام التأسيس التلقائية ✅

## 📊 حالة التنفيذ

```
✅ المرحلة 2: مُنفّذة بالكامل وتعمل بنجاح
```

---

## 🎯 الهدف

عند ولادة المزرعة (حدث FARM_BORN)، ينشئ النظام تلقائياً حزمة من 6 مهام تأسيسية
تظهر في صفحة المزرعة تحت تبويب "مهام التشغيل".

---

## 🔍 نقطة التفعيل (Trigger Point)

```sql
عندما: يتم إنشاء حدث FARM_BORN في farm_birth_events

التدفق:
INSERT into farm_birth_events (event_type='FARM_BORN')
  ↓
trigger_generate_setup_tasks_on_farm_birth()
  ↓
generate_farm_setup_tasks()
  ↓
6 مهام تُنشأ في farm_tasks
```

---

## 📦 المكونات المُنفّذة

### 1. جدول farm_setup_task_templates

```sql
الملف: create_auto_setup_tasks_system.sql

وظيفة: تخزين قوالب المهام القابلة لإعادة الاستخدام

الأعمدة:
✅ id (uuid) - المعرف الفريد
✅ title (text) - عنوان المهمة
✅ description (text) - وصف تفصيلي للمهمة
✅ task_type (text) - نوع المهمة (general, irrigation, maintenance, etc.)
✅ priority (text) - الأولوية (low, medium, high, urgent)
✅ order_index (integer) - ترتيب المهمة
✅ due_days_offset (integer) - عدد الأيام حتى الاستحقاق
✅ is_active (boolean) - هل القالب نشط؟
✅ created_at (timestamptz) - تاريخ الإنشاء

الفهارس:
✅ idx_setup_task_templates_order (order_index, is_active)

RLS:
✅ Anyone can view
✅ Admin can modify
```

### 2. القوالب الافتراضية (6 مهام)

```sql
تم إدراج القوالب التالية:

1. تعيين مدير المزرعة
   - النوع: general
   - الأولوية: urgent
   - الاستحقاق: بعد 3 أيام
   - الوصف: تحديد وتعيين مدير مزرعة مسؤول عن متابعة جميع العمليات

2. إضافة محتويات المزرعة
   - النوع: general
   - الأولوية: high
   - الاستحقاق: بعد 5 أيام
   - الوصف: تسجيل جميع الأشجار والمحاصيل مع الأنواع والأعداد

3. إدخال المعدات والأدوات
   - النوع: maintenance
   - الأولوية: high
   - الاستحقاق: بعد 5 أيام
   - الوصف: تسجيل المعدات الزراعية مع حالتها وتواريخ الصيانة

4. مراجعة بيانات المزرعة
   - النوع: inspection
   - الأولوية: high
   - الاستحقاق: بعد 7 أيام
   - الوصف: التحقق من صحة البيانات: الموقع، المساحة، التربة، المياه

5. إعداد نظام الري
   - النوع: irrigation
   - الأولوية: high
   - الاستحقاق: بعد 10 أيام
   - الوصف: فحص وإعداد نظام الري أو التخطيط لتركيب نظام جديد

6. إنشاء خطة تشغيل 30 يوم
   - النوع: general
   - الأولوية: high
   - الاستحقاق: بعد 15 يوم
   - الوصف: وضع خطة تفصيلية للشهر الأول تشمل الري والتسميد
```

### 3. Function: generate_farm_setup_tasks

```sql
CREATE OR REPLACE FUNCTION generate_farm_setup_tasks(
  p_farm_id uuid,
  p_birth_event_id uuid
)
RETURNS integer

الوظيفة:
✅ التحقق من وجود المزرعة
✅ التحقق من عدم التكرار (مهام موجودة بالفعل)
✅ جلب القوالب النشطة من farm_setup_task_templates
✅ إنشاء مهمة لكل قالب في farm_tasks
✅ إضافة علامة [AUTO-SETUP] في الوصف
✅ حساب تاريخ الاستحقاق بناءً على due_days_offset
✅ إرجاع عدد المهام المُنشأة

المميزات:
✅ Created by: "النظام الآلي"
✅ Status: "pending" (قيد الانتظار)
✅ لا تكرار - يتحقق من المهام الموجودة في آخر ساعة
✅ SECURITY DEFINER - تنفيذ آمن
```

### 4. Trigger: trigger_setup_tasks_on_farm_birth

```sql
CREATE TRIGGER trigger_setup_tasks_on_farm_birth
  AFTER INSERT ON farm_birth_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_setup_tasks_on_farm_birth()

متى يُنفّذ:
✅ عند INSERT سجل جديد في farm_birth_events
✅ فقط إذا كان event_type = 'FARM_BORN'

ماذا يفعل:
✅ يستدعي generate_farm_setup_tasks()
✅ يُحدّث metadata في حدث الولادة بعدد المهام
✅ يسجل وقت التوليد

النتيجة في metadata:
{
  "setup_tasks_generated": true,
  "setup_tasks_count": 6,
  "setup_tasks_generated_at": "2026-01-06T03:02:12.405Z"
}
```

### 5. دالة get_farm_setup_tasks

```sql
CREATE OR REPLACE FUNCTION get_farm_setup_tasks(
  p_farm_id uuid
)
RETURNS TABLE (...)

الوظيفة:
✅ جلب جميع مهام التأسيس لمزرعة معينة
✅ تحديد ما إذا كانت المهمة تلقائية (is_auto_generated)
✅ حساب الأيام المتبقية حتى الاستحقاق (days_until_due)

الترتيب:
1. حسب الحالة (pending أولاً)
2. حسب تاريخ الاستحقاق
3. حسب تاريخ الإنشاء (الأحدث أولاً)
```

### 6. دالة get_farm_setup_tasks_stats

```sql
CREATE OR REPLACE FUNCTION get_farm_setup_tasks_stats(
  p_farm_id uuid
)
RETURNS json

الإحصائيات المُرجعة:
{
  "total_tasks": 6,
  "pending": 6,
  "in_progress": 0,
  "submitted": 0,
  "approved": 0,
  "rejected": 0,
  "overdue": 0,
  "completion_rate": 0.0
}
```

---

## 🧪 الاختبار والتحقق

### نتائج الاختبار:

```sql
الملف: test_auto_setup_tasks_phase2_fixed.sql

✅ الخطوة 1: إنشاء عقد نشط
   - Contract: SETUP-TEST-20260106-030212
   - Status: active
   - ✅ نجح

✅ الخطوة 2: التحقق من حدث الولادة
   - Birth Event ID: موجود ✅
   - Metadata:
     - setup_tasks_generated: true
     - setup_tasks_count: 6
   - ✅ نجح

✅ الخطوة 3: التحقق من مهام التأسيس
   - عدد المهام المُنشأة: 6
   - ✅ نجح (المتوقع: 6)

✅ الخطوة 4-6: جميع التفاصيل صحيحة
```

### البيانات الفعلية:

```json
[
  {
    "المهمة": "تعيين مدير المزرعة",
    "النوع": "general",
    "الأولوية": "urgent",
    "الحالة": "pending",
    "أيام_متبقية": 2
  },
  {
    "المهمة": "إضافة محتويات المزرعة",
    "النوع": "general",
    "الأولوية": "high",
    "الحالة": "pending",
    "أيام_متبقية": 4
  },
  {
    "المهمة": "إدخال المعدات والأدوات",
    "النوع": "maintenance",
    "الأولوية": "high",
    "الحالة": "pending",
    "أيام_متبقية": 4
  },
  {
    "المهمة": "مراجعة بيانات المزرعة",
    "النوع": "inspection",
    "الأولوية": "high",
    "الحالة": "pending",
    "أيام_متبقية": 6
  },
  {
    "المهمة": "إعداد نظام الري",
    "النوع": "irrigation",
    "الأولوية": "high",
    "الحالة": "pending",
    "أيام_متبقية": 9
  },
  {
    "المهمة": "إنشاء خطة تشغيل 30 يوم",
    "النوع": "general",
    "الأولوية": "high",
    "الحالة": "pending",
    "أيام_متبقية": 14
  }
]
```

---

## 🎨 Frontend Integration

### الموقع في الواجهة:

```
المسار: /admin/b2f/farms/:farmId?tab=tasks

المكون: FarmDetailPage.tsx
  ↓
  activeTab = 'tasks'
  ↓
  <FarmTasksManagement farmId={farmId} farmName={farmName} />
```

### المميزات في FarmTasksManagement:

```typescript
✅ عرض جميع مهام المزرعة
✅ تحديد المهام التلقائية بعلامة [AUTO-SETUP]
✅ فلترة حسب الحالة (pending, in_progress, submitted, etc.)
✅ عرض الأولوية مع ألوان مميزة
✅ حساب الأيام المتبقية حتى الاستحقاق
✅ إجراءات: بدء، إرسال، اعتماد، رفض
✅ نظام إثبات المهام (Task Proofs)
✅ إحصائيات في الوقت الفعلي
```

### Tabs المتاحة في صفحة المزرعة:

```
1. overview - نظرة عامة
2. contents - محتويات المزرعة
3. team - الفريق
4. tasks - المهام التشغيلية ← هنا تظهر مهام التأسيس
5. equipment - المعدات
6. calculator - حاسبة المالية
7. timeline - الجدول الزمني
```

---

## 📊 الإحصائيات من الاختبار

```json
{
  "total_tasks": 6,
  "pending": 6,
  "in_progress": 0,
  "submitted": 0,
  "approved": 0,
  "rejected": 0,
  "overdue": 0,
  "completion_rate": 0
}
```

---

## ✅ متطلبات المرحلة 2 - مُنجزة

### المطلوب الأساسي:

- [x] Backend: نظام توليد المهام التلقائية
- [x] Trigger عند ولادة المزرعة
- [x] إنشاء 6 مهام تأسيسية
- [x] Frontend: عرض المهام في /admin/b2f/farms/:farmId
- [x] Tab "مهام التشغيل" موجود ويعمل

### اختبار القبول:

- [x] بعد "FARM_BORN" → 6 مهام تظهر تلقائياً ✅
- [x] المهام تظهر في صفحة المزرعة تحت تبويب tasks ✅
- [x] كل مهمة لها تاريخ استحقاق مختلف ✅
- [x] المهام مرتبة حسب الأولوية والاستحقاق ✅

---

## 🔄 التدفق الكامل (المرحلة 1 + 2)

```
┌─────────────────────────────────────┐
│  1. إنشاء/تفعيل عقد                │
│     status = 'active'               │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  2. حدث ولادة المزرعة               │
│     farm_birth_events               │
│     event_type: FARM_BORN           │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  3. توليد مهام التأسيس              │
│     generate_farm_setup_tasks()     │
│     → 6 مهام في farm_tasks          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  4. تحديث metadata                  │
│     setup_tasks_generated: true     │
│     setup_tasks_count: 6            │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  5. المهام تظهر في Frontend         │
│     /admin/b2f/farms/:id?tab=tasks  │
└─────────────────────────────────────┘
```

---

## 📝 استعلامات مفيدة

### جلب مهام التأسيس لمزرعة:

```sql
SELECT * FROM get_farm_setup_tasks('farm_id_here');
```

### إحصائيات مهام التأسيس:

```sql
SELECT get_farm_setup_tasks_stats('farm_id_here');
```

### جميع مهام التأسيس التلقائية:

```sql
SELECT
  ft.title,
  ft.type,
  ft.priority,
  ft.status,
  ft.due_date,
  f.name as farm_name
FROM farm_tasks ft
JOIN b2f_farms f ON f.id = ft.farm_id
WHERE ft.description LIKE '%[AUTO-SETUP]%'
ORDER BY ft.due_date;
```

### المزارع التي لديها مهام تأسيس:

```sql
SELECT
  f.name,
  COUNT(ft.id) as setup_tasks_count,
  COUNT(ft.id) FILTER (WHERE ft.status = 'approved') as completed_tasks
FROM b2f_farms f
JOIN farm_tasks ft ON ft.farm_id = f.id
WHERE ft.description LIKE '%[AUTO-SETUP]%'
GROUP BY f.id, f.name
ORDER BY setup_tasks_count DESC;
```

---

## 🎯 النقاط المهمة

### 1. التكامل مع المرحلة 1

```
✅ المرحلة 1 تُنشئ حدث الولادة
✅ المرحلة 2 تلتقط الحدث وتُنشئ المهام
✅ التكامل سلس وبدون تعارض
✅ كل مرحلة مستقلة ويمكن اختبارها منفصلة
```

### 2. حماية من التكرار

```sql
✅ التحقق من المهام الموجودة في آخر ساعة
✅ UNIQUE constraint على contract_id في farm_birth_events
✅ عقد واحد = حدث ولادة واحد = 6 مهام فقط
```

### 3. المرونة

```sql
✅ إضافة/تعديل/حذف قوالب المهام من farm_setup_task_templates
✅ تفعيل/تعطيل قوالب عبر is_active
✅ تخصيص تاريخ الاستحقاق عبر due_days_offset
✅ أنواع مهام متعددة (general, irrigation, maintenance, etc.)
```

### 4. الأداء

```sql
✅ فهرس على (order_index, is_active)
✅ trigger خفيف ولا يؤثر على سرعة إنشاء العقود
✅ استعلامات محسّنة مع filtering
✅ SECURITY DEFINER للأمان
```

---

## 🚀 الخطوات التالية (المراحل القادمة)

### المرحلة 3: Task Assignment & Notifications

```
- تعيين تلقائي للمهام حسب الأدوار
- إشعارات للفريق عند إنشاء المهام
- تذكيرات بالمهام المتأخرة
- Dashboard لمتابعة التقدم
```

### المرحلة 4: Automated Workflows

```
- إنشاء workflows تلقائية بناءً على حالة المهام
- ربط المهام بالعمليات التشغيلية
- تقارير دورية عن التقدم
- KPIs لمهام التأسيس
```

### المرحلة 5: AI-Powered Task Suggestions

```
- اقتراحات ذكية للمهام بناءً على البيانات
- تعديل تلقائي لأولويات المهام
- توقع المشاكل المحتملة
- توصيات لتسريع التأسيس
```

---

## ✅ ملخص التنفيذ

```
الحالة: ✅ المرحلة 2 مُنجزة بالكامل

المكونات:
✅ جدول farm_setup_task_templates (6 قوالب)
✅ Function generate_farm_setup_tasks
✅ Trigger trigger_setup_tasks_on_farm_birth
✅ دوال مساعدة (2)
✅ RLS Policies
✅ Frontend Integration
✅ اختبارات شاملة

النتائج:
✅ 6 مهام تُنشأ تلقائياً
✅ المهام تظهر في صفحة المزرعة
✅ التكامل مع المرحلة 1 يعمل بنجاح
✅ لا أخطاء
✅ Build ناجح

الوقت المستغرق: ~25 دقيقة
الكود: نظيف ومُوثّق
الجودة: إنتاجية
```

---

**المرحلة 2: نظام مهام التأسيس التلقائية - مُنجزة بنجاح! 🎉**

**التكامل مع المرحلة 1 يعمل بشكل مثالي! 🚀**

**جاهز للمرحلة 3 متى ما طُلب ذلك! 📋**
