# Farm Scope System - دليل الاختبار السريع

## 🎯 الهدف
التحقق من أن نظام النطاق يعمل بشكل صحيح لجميع أنواع الموظفين.

---

## ⏱️ وقت الاختبار: 10 دقائق

---

## 🧪 السيناريوهات

### السيناريو 1: General Manager (GLOBAL) ✅

**الخطوات:**
1. سجل دخول كـ GM
2. انتقل إلى `/admin/my-work`
3. افتح Console وشغل:
   ```javascript
   // في useStaffScope hook
   console.log(scope);
   ```

**النتيجة المتوقعة:**
```javascript
{
  scopeType: 'GLOBAL',
  isGlobal: true,
  canAccessAllFarms: true,
  farmIds: [/* جميع المزارع */]
}
```

**التحقق:**
- ✅ يرى جميع المزارع في القوائم
- ✅ يستطيع الدخول إلى أي مزرعة
- ✅ `get_my_work` يعرض مهام من جميع المزارع
- ✅ لا توجد فلترة على farm_id

---

### السيناريو 2: مدير المزارع الوطني (DEPARTMENT: B2F) ✅

**الإعداد:**
```sql
UPDATE platform_staff
SET scope_type = 'DEPARTMENT', scope_board = 'B2F'
WHERE staff_name = 'مدير المزارع الوطني';
```

**الخطوات:**
1. سجل دخول كمدير المزارع الوطني
2. افتح `/admin/b2f/farms`

**النتيجة المتوقعة:**
```javascript
{
  scopeType: 'DEPARTMENT',
  scopeBoard: 'B2F',
  canAccessAllFarms: true,
  farmIds: [/* جميع مزارع B2F */]
}
```

**التحقق:**
- ✅ يرى جميع مزارع B2F
- ✅ يستطيع الدخول لأي مزرعة B2F
- ✅ `get_my_work` يعرض مهام من جميع مزارع B2F
- ✅ لا يرى مزارع أخرى خارج B2F (إن وجدت)

---

### السيناريو 3: مدير مزرعة (FARM) ✅

**الإعداد:**
```sql
-- 1. إنشاء موظف
INSERT INTO platform_staff (staff_name, role, scope_type)
VALUES ('أحمد - مدير مزرعة الرياض', 'staff', 'FARM');

-- 2. ربطه بمزرعة
INSERT INTO farm_team (user_id, farm_id, role, is_active)
VALUES (
  (SELECT id FROM platform_staff WHERE staff_name = 'أحمد - مدير مزرعة الرياض'),
  (SELECT id FROM b2f_farms WHERE name = 'مزرعة الرياض'),
  'farm_manager',
  true
);
```

**الخطوات:**
1. سجل دخول كـ أحمد
2. افتح `/admin/my-work`

**النتيجة المتوقعة:**
```javascript
{
  scopeType: 'FARM',
  isGlobal: false,
  canAccessAllFarms: false,
  farmIds: ['مزرعة الرياض ID فقط']
}
```

**التحقق:**
- ✅ يرى مزرعة الرياض فقط
- ✅ يستطيع الدخول إلى `/admin/b2f/farms/[riyadh-farm-id]`
- ✅ لا يستطيع الدخول إلى مزارع أخرى (يُحوّل أو رسالة خطأ)
- ✅ `get_my_work` يعرض مهام من مزرعته فقط
- ✅ `isFarmManager('riyadh-farm-id')` === true

---

### السيناريو 4: مهندس مزرعة (FARM) ✅

**الإعداد:**
```sql
-- 1. إنشاء موظف
INSERT INTO platform_staff (staff_name, role, scope_type)
VALUES ('خالد - مهندس مزرعة جدة', 'staff', 'FARM');

-- 2. ربطه بمزرعة
INSERT INTO farm_team (user_id, farm_id, role, is_active)
VALUES (
  (SELECT id FROM platform_staff WHERE staff_name = 'خالد - مهندس مزرعة جدة'),
  (SELECT id FROM b2f_farms WHERE name = 'مزرعة جدة'),
  'engineer',
  true
);
```

**الخطوات:**
1. سجل دخول كـ خالد
2. افتح `/admin/my-work`

**النتيجة المتوقعة:**
```javascript
{
  scopeType: 'FARM',
  farmIds: ['مزرعة جدة ID فقط'],
  // في farms array:
  farms: [{
    farm_id: 'jeddah-farm-id',
    user_role: 'engineer',
    is_manager: false
  }]
}
```

**التحقق:**
- ✅ يرى مزرعة جدة فقط
- ✅ `isFarmManager('jeddah-farm-id')` === false
- ✅ `getFarmRole('jeddah-farm-id')` === 'engineer'
- ✅ يستطيع رؤية تفاصيل المزرعة
- ✅ لا يستطيع تعديل إعدادات المزرعة (إذا كان محمي لـ managers فقط)

---

### السيناريو 5: موظف بدون تعيين (FARM ولكن بدون مزارع) ⚠️

**الإعداد:**
```sql
-- موظف جديد لم يُعين لأي مزرعة
INSERT INTO platform_staff (staff_name, role, scope_type)
VALUES ('سارة - جديدة', 'staff', 'FARM');
```

**الخطوات:**
1. سجل دخول كـ سارة
2. افتح `/admin/my-work`

**النتيجة المتوقعة:**
```javascript
{
  scopeType: 'FARM',
  farmIds: [],  // قائمة فارغة
  farms: []
}
```

**التحقق:**
- ✅ لا ترى أي مزارع
- ✅ صفحة "عملي" فارغة (لا مهام)
- ✅ لا تستطيع الدخول لأي مزرعة
- ✅ رسالة واضحة: "لم يتم تعيينك لأي مزرعة بعد"

---

## 🔍 اختبارات Route Guard

### اختبار 1: وصول مدير مزرعة لمزرعة أخرى
```
URL: /admin/b2f/farms/[other-farm-id]
Expected: ❌ Access Denied → Redirect to /admin/my-work
```

### اختبار 2: وصول مهندس لصفحة Farm Command
```
URL: /admin/b2f/farm-command/[his-farm-id]
Expected: ✅ Access Granted
```

### اختبار 3: GM يدخل لأي مزرعة
```
URL: /admin/b2f/farms/[any-farm-id]
Expected: ✅ Access Granted (always)
```

---

## 🛠️ اختبارات الـ Functions

### Test: `get_staff_scope`
```sql
SELECT get_staff_scope('[staff-uuid]');

-- Expected output:
{
  "scopeType": "FARM",
  "scopeBoard": null,
  "role": "staff",
  "department": null,
  "farmIds": ["uuid1", "uuid2"],
  "isGlobal": false,
  "canAccessAllFarms": false
}
```

### Test: `get_staff_farms`
```sql
SELECT * FROM get_staff_farms('[staff-uuid]');

-- Expected rows:
farm_id | farm_name | farm_code | user_role | is_manager
--------+-----------+-----------+-----------+-----------
uuid1   | مزرعة 1   | F001      | engineer  | false
```

### Test: `check_farm_access`
```sql
-- مدير مزرعة يتحقق من مزرعته
SELECT check_farm_access('[manager-uuid]', '[his-farm-uuid]');
-- Expected: true

-- مدير مزرعة يتحقق من مزرعة أخرى
SELECT check_farm_access('[manager-uuid]', '[other-farm-uuid]');
-- Expected: false

-- GM يتحقق من أي مزرعة
SELECT check_farm_access('[gm-uuid]', '[any-farm-uuid]');
-- Expected: true (always)
```

---

## 🔄 اختبارات التكامل

### Test: `get_my_work` مع Scope

**GM:**
```sql
SELECT get_my_work('[gm-uuid]');
-- tasks: يحتوي على مهام من جميع المزارع
-- approvals: جميع الموافقات
```

**مدير مزرعة:**
```sql
SELECT get_my_work('[farm-manager-uuid]');
-- tasks: فقط مهام من مزرعته
-- approvals: فقط موافقات متعلقة بمزرعته
```

**مهندس:**
```sql
SELECT get_my_work('[engineer-uuid]');
-- tasks: فقط مهامه المعينة له في مزرعته
```

---

## ✅ Checklist النهائي

### قاعدة البيانات
- [ ] `platform_staff.scope_type` موجود
- [ ] `platform_staff.scope_board` موجود
- [ ] `get_staff_scope()` يعمل
- [ ] `get_staff_farms()` يعمل
- [ ] `check_farm_access()` يعمل
- [ ] `get_my_work()` محدث مع scope filter

### Frontend
- [ ] `useStaffScope()` hook يعمل
- [ ] `FarmScopeGuard` يحمي المسارات
- [ ] `useMyWork()` يتضمن scope
- [ ] صفحة My Work تطبق الفلترة
- [ ] صفحة Farm Command تطبق الفلترة
- [ ] صفحة Farm Details محمية بـ Guard

### اختبارات المستخدم
- [ ] GM يرى الجميع
- [ ] مدير المزارع الوطني يرى جميع B2F
- [ ] مدير مزرعة يرى مزرعته فقط
- [ ] مهندس يرى مزرعته فقط
- [ ] موظف بدون تعيين لا يرى شيء
- [ ] Route Guard يمنع الوصول غير المصرح

### Performance
- [ ] `get_my_work` لا يزال سريع (<200ms)
- [ ] `useStaffScope` لا يسبب re-renders زائدة
- [ ] الفلترة تطبق في SQL (ليس في JS)

---

## 🐛 مشاكل محتملة وحلولها

### المشكلة 1: موظف لا يرى مزارعه
**السبب المحتمل:**
- `farm_team.is_active = false`
- `scope_type` ليس 'FARM'

**الحل:**
```sql
UPDATE farm_team
SET is_active = true
WHERE user_id = '[staff-uuid]';
```

### المشكلة 2: GM يواجه Access Denied
**السبب المحتمل:**
- `scope_type` ليس 'GLOBAL'
- الـ function لا تتحقق من role

**الحل:**
```sql
UPDATE platform_staff
SET scope_type = 'GLOBAL'
WHERE role = 'general_manager';
```

### المشكلة 3: مدير المزارع الوطني لا يرى جميع المزارع
**السبب المحتمل:**
- `scope_type` ليس 'DEPARTMENT'
- `scope_board` ليس 'B2F'

**الحل:**
```sql
UPDATE platform_staff
SET scope_type = 'DEPARTMENT', scope_board = 'B2F'
WHERE staff_name = 'مدير المزارع الوطني';
```

---

## 📊 نتائج الاختبار

| السيناريو | النتيجة | ملاحظات |
|-----------|---------|---------|
| GM - Global Access | ⬜ | |
| مدير المزارع الوطني | ⬜ | |
| مدير مزرعة | ⬜ | |
| مهندس مزرعة | ⬜ | |
| موظف بدون تعيين | ⬜ | |
| Route Guard - Access Granted | ⬜ | |
| Route Guard - Access Denied | ⬜ | |

---

**تم إنشاء الدليل** ✅
**التاريخ:** 2026-01-06
