# دليل اختبار نظام الصلاحيات التفصيلية
**التاريخ**: 2026-01-03

---

## 🧪 الاختبارات المطلوبة

### ✅ اختبار 1: عرض الأدوار المُعرفة

**الخطوات:**
1. سجل دخول كمالك المنصة أو مدير عام
2. انتقل إلى `/hq`
3. اضغط على تبويب "الهيكلة والصلاحيات"
4. في القائمة الجانبية، يجب أن ترى 9 أدوار

**النتيجة المتوقعة:**
```
✅ مالك المنصة (Level 1)
✅ مدير عام (Level 2)
✅ المدير العام (Level 3)
✅ مدير قسم (Level 4)
✅ مدير مزرعة (Level 5)
✅ مشرف مزرعة (Level 6)
✅ مشرف عمليات (Level 7)
✅ منفذ مهام (Level 8)
✅ مشاهد (Level 9)
```

---

### ✅ اختبار 2: إعدادات الدخول الذكي

**الخطوات:**
1. في قائمة الأدوار، اضغط على "مدير مزرعة"
2. اضغط على تبويب "إعدادات الدخول الذكي"
3. راجع الإعدادات المعروضة

**النتيجة المتوقعة:**
```
طريقة الدخول:
  ✅ يتطلب Barcode
  ✅ يتطلب PIN
  📱 نوع Barcode: دائم

إعدادات الجهاز:
  ✅ رفع صورة Barcode
  ✅ مسح بالكاميرا
  ❌ ربط أول جهاز
  ❌ أجهزة متعددة

إعدادات الجلسة:
  ⏱️ مدة الجلسة: 45 دقيقة
  ⏱️ مهلة عدم النشاط: 45 دقيقة
```

---

### ✅ اختبار 3: الصلاحيات التشغيلية

**الخطوات:**
1. اختر "مدير مزرعة" من القائمة
2. اضغط على تبويب "الصلاحيات التشغيلية"
3. راجع الصلاحيات

**النتيجة المتوقعة:**
```
إدارة العمليات (manage_operations):
  ✅ إنشاء | ✅ عرض | ✅ تعديل | ❌ حذف
  ✅ اعتماد | ✅ رفض | ✅ توزيع
  ✅ رفع إثبات | ✅ مراجعة تقارير | ✅ إرسال للإدارة

إدارة المهام (manage_tasks):
  ✅ إنشاء | ✅ عرض | ✅ تعديل | ✅ حذف
  ✅ اعتماد | ✅ رفض | ✅ توزيع
  ✅ رفع إثبات | ✅ مراجعة تقارير | ✅ إرسال للإدارة

إدارة الفريق (manage_team):
  ❌ إنشاء | ✅ عرض | ✅ تعديل | ❌ حذف
  ❌ اعتماد | ❌ رفض | ✅ توزيع
```

---

### ✅ اختبار 4: نطاق الصلاحيات

**الخطوات:**
1. اختر "مالك المنصة" من القائمة
2. اضغط على تبويب "نطاق الصلاحيات"
3. راجع النطاق

**النتيجة المتوقعة:**
```
📍 المنصة الكاملة
   ✅ ينطبق على الكل
```

---

### ✅ اختبار 5: التحقق من Database

**الخطوات:**
1. افتح Supabase Dashboard
2. انتقل إلى SQL Editor
3. شغّل الاستعلامات التالية:

```sql
-- عرض جميع الأدوار
SELECT role_key, role_name_ar, hierarchy_level, is_active
FROM role_definitions
ORDER BY hierarchy_level;

-- عرض إعدادات الدخول لمدير المزرعة
SELECT *
FROM role_access_settings
WHERE role_key = 'farm_manager';

-- عرض الصلاحيات التشغيلية لمدير المزرعة
SELECT permission_key, permission_name_ar,
       can_create, can_view, can_edit, can_approve
FROM role_operational_permissions
WHERE role_key = 'farm_manager';

-- استخدام الدالة المساعدة
SELECT get_role_full_permissions('farm_manager');

-- التحقق من صلاحية معينة
SELECT check_role_permission('farm_manager', 'manage_operations', 'approve');
```

**النتيجة المتوقعة:**
- ✅ جميع الاستعلامات تعمل بدون أخطاء
- ✅ البيانات متسقة ومنطقية

---

### ✅ اختبار 6: مقارنة الأدوار

قارن بين ثلاثة أدوار مختلفة:

| الصلاحية | مالك المنصة | مدير مزرعة | منفذ مهام |
|---------|------------|-----------|----------|
| **الدخول** |
| يتطلب Barcode | ✅ | ✅ | ✅ |
| يتطلب PIN | ✅ | ✅ | ❌ |
| نوع Barcode | دائم | دائم | مؤقت |
| **المهام** |
| إنشاء مهام | ✅ | ✅ | ❌ |
| عرض مهام | ✅ | ✅ | ✅ |
| اعتماد مهام | ✅ | ✅ | ❌ |
| رفع إثبات | ✅ | ✅ | ✅ |
| **العمليات** |
| إنشاء عمليات | ✅ | ✅ | ❌ |
| اعتماد عمليات | ✅ | ✅ | ❌ |
| **الجلسة** |
| مدة الجلسة | 60 د | 45 د | 30 د |

---

### ✅ اختبار 7: التكامل مع الباركود

**الخطوات:**
1. أنشئ Barcode لـ "مدير مزرعة"
2. امسح الBarcode من صفحة `/admin/access`
3. تحقق من طلب PIN
4. أدخل PIN صحيح
5. تحقق من إنشاء الجلسة

**كود التحقق:**
```javascript
// في Console بعد الدخول
const session = JSON.parse(localStorage.getItem('platform_staff_session'));
console.log('Role:', session.role);
console.log('Requires PIN: true'); // يجب أن يكون قد طلب PIN

// التحقق من إعدادات الدخول
const { data } = await supabase
  .from('role_access_settings')
  .select('*')
  .eq('role_key', session.role)
  .single();

console.log('Access Settings:', data);
```

**النتيجة المتوقعة:**
- ✅ طلب PIN عند مسح Barcode مدير المزرعة
- ✅ لم يطلب PIN عند مسح Barcode منفذ المهام
- ✅ مدة الجلسة صحيحة

---

### ✅ اختبار 8: التكامل مع المهام

**السيناريو**: مدير مزرعة يحاول إنشاء مهمة

**الخطوات:**
```javascript
// 1. التحقق من صلاحية الإنشاء
const { data: canCreate } = await supabase
  .rpc('check_role_permission', {
    p_role_key: 'farm_manager',
    p_permission_key: 'manage_tasks',
    p_action: 'create'
  });

console.log('Can create tasks:', canCreate); // يجب أن يكون true

// 2. محاولة الإنشاء
if (canCreate) {
  console.log('✅ مدير المزرعة يمكنه إنشاء مهام');
} else {
  console.log('❌ مدير المزرعة لا يمكنه إنشاء مهام');
}

// 3. التحقق من صلاحية الحذف
const { data: canDelete } = await supabase
  .rpc('check_role_permission', {
    p_role_key: 'farm_manager',
    p_permission_key: 'manage_operations',
    p_action: 'delete'
  });

console.log('Can delete operations:', canDelete); // يجب أن يكون false
```

**النتيجة المتوقعة:**
- ✅ `can_create = true` للمهام
- ✅ `can_delete = false` للعمليات

---

### ✅ اختبار 9: نطاق الصلاحيات

**الخطوات:**
```sql
-- مدير قسم محدد (B2F فقط)
INSERT INTO role_scope_permissions (role_key, scope_type, scope_value, applies_to_all)
VALUES ('section_manager', 'section', 'b2f', false);

-- مدير مزرعة محددة
INSERT INTO role_scope_permissions (role_key, scope_type, scope_value, applies_to_all)
VALUES ('farm_manager', 'farm', 'farm_id_123', false);

-- التحقق
SELECT rd.role_name_ar, rsp.scope_type, rsp.scope_value, rsp.applies_to_all
FROM role_definitions rd
JOIN role_scope_permissions rsp ON rd.role_key = rsp.role_key
WHERE rd.role_key IN ('section_manager', 'farm_manager');
```

**النتيجة المتوقعة:**
```
مدير قسم | section | b2f | false
مدير مزرعة | farm | farm_id_123 | false
```

---

### ✅ اختبار 10: RLS والأمان

**الخطوات:**
```sql
-- 1. القراءة (يجب أن تنجح للمستخدمين المُصادقين)
SELECT * FROM role_definitions; -- ✅

-- 2. الكتابة كمستخدم عادي (يجب أن تفشل)
UPDATE role_definitions
SET description = 'test'
WHERE role_key = 'farm_manager'; -- ❌ Permission denied

-- 3. الكتابة كإدارة عليا (يجب أن تنجح)
-- (يجب تسجيل الدخول كمالك المنصة أولاً)
UPDATE role_definitions
SET description = 'test'
WHERE role_key = 'farm_manager'; -- ✅
```

**النتيجة المتوقعة:**
- ✅ الجميع يمكنهم القراءة
- ✅ الإدارة العليا فقط يمكنها الكتابة
- ❌ المستخدمون العاديون لا يمكنهم الكتابة

---

## 🎯 سيناريوهات الاستخدام الكاملة

### سيناريو كامل 1: دورة حياة مهمة

```
1. مدير المزرعة:
   - يدخل بـ Barcode + PIN ✅
   - ينشئ مهمة "سقاية الأشجار" ✅ (can_create)
   - يوزعها على منفذ مهام ✅ (can_assign)

2. منفذ المهام:
   - يدخل بـ Barcode مؤقت (بدون PIN) ✅
   - يرى المهمة المُكلف بها ✅ (can_view)
   - يُنفذ المهمة
   - يرفع صورة إثبات ✅ (can_upload_proof)
   - يحاول اعتمادها بنفسه ❌ (can_approve = false)

3. مشرف العمليات:
   - يدخل بـ Barcode (بدون PIN) ✅
   - يرى المهمة المُنفذة ✅ (can_view)
   - يراجع الإثبات ✅ (can_review_reports)
   - يعتمد المهمة ✅ (can_approve)

4. مدير المزرعة:
   - يرى المهمة المُعتمدة ✅
   - يراجع التقرير ✅ (can_review_reports)
   - يُرسله للإدارة العليا ✅ (can_send_to_management)
```

**✅ جميع الخطوات يجب أن تعمل كما هو متوقع**

---

## 📊 التقارير المطلوبة

### تقرير 1: ملخص الأدوار
```sql
SELECT
  rd.role_name_ar AS "الدور",
  ras.requires_qr AS "Barcode",
  ras.requires_pin AS "PIN",
  ras.session_duration_minutes AS "مدة الجلسة",
  COUNT(rop.id) AS "عدد الصلاحيات"
FROM role_definitions rd
LEFT JOIN role_access_settings ras ON rd.role_key = ras.role_key
LEFT JOIN role_operational_permissions rop ON rd.role_key = rop.role_key
GROUP BY rd.role_key, rd.role_name_ar, ras.requires_qr, ras.requires_pin, ras.session_duration_minutes
ORDER BY rd.hierarchy_level;
```

### تقرير 2: مصفوفة الصلاحيات
```sql
SELECT
  rd.role_name_ar AS "الدور",
  rop.permission_name_ar AS "الصلاحية",
  CASE WHEN rop.can_create THEN '✅' ELSE '❌' END AS "إنشاء",
  CASE WHEN rop.can_approve THEN '✅' ELSE '❌' END AS "اعتماد",
  CASE WHEN rop.can_assign THEN '✅' ELSE '❌' END AS "توزيع"
FROM role_definitions rd
JOIN role_operational_permissions rop ON rd.role_key = rop.role_key
ORDER BY rd.hierarchy_level, rop.permission_category;
```

---

## ✅ قائمة التحقق النهائية

- [ ] جميع الأدوار التسعة موجودة
- [ ] إعدادات الدخول صحيحة لكل دور
- [ ] الصلاحيات التشغيلية محددة ومنطقية
- [ ] نطاق الصلاحيات محدد للأدوار المحلية
- [ ] RLS يعمل بشكل صحيح
- [ ] الدوال المساعدة تعمل
- [ ] التكامل مع الباركود يعمل
- [ ] التكامل مع المهام يعمل
- [ ] الواجهة تعرض جميع المعلومات
- [ ] لا توجد أخطاء في Console

---

## 🐛 المشاكل الشائعة وحلولها

### المشكلة 1: لا تظهر الأدوار
**الحل**: تحقق من تطبيق Migration بنجاح
```sql
SELECT * FROM role_definitions;
```

### المشكلة 2: Permission Denied عند الكتابة
**الحل**: تأكد من تسجيل الدخول كإدارة عليا
```sql
SELECT is_platform_admin(auth.uid());
```

### المشكلة 3: الدالة المساعدة لا تعمل
**الحل**: تحقق من وجود الدالة
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%role%';
```

---

**جاهز للاختبار الشامل!** 🧪
