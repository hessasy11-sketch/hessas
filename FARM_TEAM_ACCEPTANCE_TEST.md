# اختبار قبول: فريق المزرعة (Farm Team)
## المرحلة 3 - اختبارات شاملة

**التاريخ:** 2026-01-05
**الحالة:** ✅ جاهز للاختبار

---

## الهدف من الاختبار

التأكد من:
1. عزل كامل بين المزارع
2. نظام الدعوات يعمل مع scope=farm
3. الأدوار محددة بشكل صحيح
4. لا يمكن لموظف مزرعة A الوصول إلى مزرعة B

---

## Pre-requisites (متطلبات قبل الاختبار)

يجب أن يكون لديك:
- ✅ مزرعتان على الأقل (مزرعة A ومزرعة B)
- ✅ وصول إلى صفحة تفاصيل المزرعة `/admin/b2f/farms/:farmId`
- ✅ الأدوار متوفرة في `authority_roles_catalog`:
  - FIELD_SUPERVISOR (مشرف ميداني)
  - AGRONOMIST_ENGINEER (مهندس زراعي)
  - TECHNICIAN (فني)
  - WORKER (عامل)
  - FACTORY_SUPERVISOR (مشرف مصنع)

---

## Test Case 1: إضافة عضو لمزرعة A

### الخطوات:

1. انتقل إلى `/admin/b2f/farms/:farmIdA`
2. اضغط على تاب **"فريق المزرعة"**
3. اضغط على زر **"إضافة عضو للفريق"**
4. املأ النموذج:
   - **الاسم:** أحمد محمد
   - **رقم الجوال:** 0501234567
   - **الدور:** مشرف ميداني (Field Supervisor)
   - **نطاق الصلاحية:** farm (يجب أن يكون محدد تلقائياً)
   - **المزرعة:** مزرعة A (يجب أن تكون محددة تلقائياً)
5. اضغط **"إرسال الدعوة"**

### النتائج المتوقعة:

✅ يظهر نموذج نجاح مع كود الدعوة (مثال: `INV-XXXXX`)
✅ الدعوة تظهر في قسم **"دعوات معلقة"**
✅ معلومات الدعوة تظهر:
  - الاسم: أحمد محمد
  - الهاتف: 0501234567
  - الدور: مشرف ميداني
  - كود الدعوة
  - تاريخ الانتهاء (بعد 30 يوم)

### التحقق من قاعدة البيانات:

```sql
SELECT
  invitee_name,
  invitee_phone,
  authority_role,
  scope_type,
  scope_farm_id,
  status
FROM authority_invitations
WHERE invitee_phone = '0501234567';
```

**المتوقع:**
```
invitee_name: أحمد محمد
authority_role: FIELD_SUPERVISOR
scope_type: farm
scope_farm_id: [farmIdA UUID]
status: invited
```

---

## Test Case 2: قبول الدعوة

### الخطوات:

1. الموظف يستلم كود الدعوة `INV-XXXXX`
2. يذهب إلى صفحة قبول الدعوات `/admin/invitations/accept`
3. يدخل كود الدعوة
4. يضغط **"قبول الدعوة"**

### النتائج المتوقعة:

✅ رسالة نجاح "تم قبول الدعوة بنجاح"
✅ الموظف يُنشأ في `platform_staff` (إذا لم يكن موجوداً)
✅ `authority_assignment` يُنشأ تلقائياً:
  - staff_id → الموظف
  - authority_role → FIELD_SUPERVISOR
  - scope_type → farm
  - scope_farm_id → farmIdA
  - status → active

### التحقق من قاعدة البيانات:

```sql
SELECT
  ps.name,
  ps.staff_code,
  aa.authority_role,
  aa.scope_type,
  aa.scope_farm_id,
  aa.status
FROM platform_staff ps
JOIN authority_assignments aa ON aa.staff_id = ps.id
WHERE ps.phone = '0501234567';
```

**المتوقع:**
```
name: أحمد محمد
authority_role: FIELD_SUPERVISOR
scope_type: farm
scope_farm_id: [farmIdA UUID]
status: active
```

---

## Test Case 3: عرض العضو في قائمة الفريق

### الخطوات:

1. بعد قبول الدعوة، عد إلى `/admin/b2f/farms/:farmIdA`
2. افتح تاب **"فريق المزرعة"**

### النتائج المتوقعة:

✅ العضو يظهر في قسم **"أعضاء الفريق"**
✅ معلومات العضو كاملة:
  - الاسم: أحمد محمد
  - رمز الموظف: STAFF-XXXXX
  - الدور: مشرف ميداني
  - القسم: B2F
  - الهاتف: 0501234567
  - الحالة: نشط (badge أخضر)
  - تاريخ الانضمام
✅ زر **"إزالة"** متاح

---

## Test Case 4: عزل المزارع (الاختبار الأهم!)

### الخطوات:

1. بعد إضافة أحمد محمد لمزرعة A
2. انتقل إلى مزرعة B: `/admin/b2f/farms/:farmIdB`
3. افتح تاب **"فريق المزرعة"**

### النتائج المتوقعة:

✅ **مزرعة B لا تعرض أحمد محمد**
✅ قائمة الفريق فارغة أو تعرض أعضاء مزرعة B فقط
✅ لا توجد دعوات معلقة من مزرعة A
✅ **عزل كامل بين المزارع**

### التحقق من قاعدة البيانات:

```sql
-- يجب أن لا يُرجع أي نتائج
SELECT *
FROM authority_assignments
WHERE staff_id = (SELECT id FROM platform_staff WHERE phone = '0501234567')
  AND scope_farm_id = '[farmIdB UUID]';
```

**المتوقع:** 0 rows (لا توجد نتائج)

---

## Test Case 5: إضافة عضو ثاني بدور مختلف

### الخطوات:

1. في مزرعة A، اضغط **"إضافة عضو للفريق"**
2. املأ النموذج:
   - **الاسم:** فاطمة علي
   - **رقم الجوال:** 0509876543
   - **الدور:** مهندس زراعي (Agronomist Engineer)
3. أرسل الدعوة

### النتائج المتوقعة:

✅ دعوة جديدة تُنشأ بنجاح
✅ الدور: مهندس زراعي
✅ scope_farm_id: farmIdA

---

## Test Case 6: حذف عضو من الفريق

### الخطوات:

1. في قائمة فريق مزرعة A
2. اضغط **"إزالة"** على أحمد محمد
3. أكد الحذف

### النتائج المتوقعة:

✅ رسالة تأكيد: "هل أنت متأكد من إزالة أحمد محمد من فريق المزرعة؟"
✅ بعد التأكيد: "تم إزالة العضو بنجاح"
✅ أحمد محمد يختفي من قائمة الفريق
✅ `authority_assignment` يُحذف أو status → revoked

### التحقق من قاعدة البيانات:

```sql
SELECT status
FROM authority_assignments
WHERE staff_id = (SELECT id FROM platform_staff WHERE phone = '0501234567')
  AND scope_farm_id = '[farmIdA UUID]';
```

**المتوقع:** status = 'revoked' أو 0 rows (محذوف تماماً)

---

## Test Case 7: إلغاء دعوة معلقة

### الخطوات:

1. أرسل دعوة جديدة لموظف (لا تقبلها)
2. في قسم **"دعوات معلقة"**، اضغط **"إلغاء الدعوة"**
3. أكد الإلغاء

### النتائج المتوقعة:

✅ رسالة تأكيد: "هل أنت متأكد من إلغاء دعوة [الاسم]؟"
✅ بعد التأكيد: "تم إلغاء الدعوة بنجاح"
✅ الدعوة تختفي من قائمة الدعوات المعلقة
✅ status في قاعدة البيانات → cancelled

---

## Test Case 8: عرض الأدوار المتاحة

### الخطوات:

1. اضغط **"إضافة عضو للفريق"**
2. افتح قائمة **"الدور"**

### النتائج المتوقعة:

✅ يظهر 5 أدوار فقط (مخصصة للمزارع):
  - مشرف ميداني (FIELD_SUPERVISOR)
  - مهندس زراعي (AGRONOMIST_ENGINEER)
  - فني (TECHNICIAN)
  - عامل (WORKER)
  - مشرف مصنع (FACTORY_SUPERVISOR)

✅ لا تظهر أدوار منصة أخرى (PLATFORM_OWNER, GENERAL_MANAGER, إلخ)

---

## Test Case 9: محاولة قبول دعوة منتهية

### الخطوات:

1. أنشئ دعوة بصلاحية يوم واحد فقط
2. انتظر حتى تنتهي (أو عدّل expires_at في قاعدة البيانات)
3. حاول قبول الدعوة باستخدام الكود

### النتائج المتوقعة:

✅ رسالة خطأ: "هذه الدعوة منتهية الصلاحية"
✅ الدعوة لا تُقبل
✅ لا يُنشأ authority_assignment

---

## Test Case 10: مدير المزرعة يرى فريقه فقط

### الخطوات:

1. أنشئ مدير لمزرعة A (farm_manager_id في fc_operational_farms)
2. سجل دخول المدير
3. انتقل إلى `/admin/b2f/farms/:farmIdA`
4. افتح تاب **"فريق المزرعة"**

### النتائج المتوقعة:

✅ مدير المزرعة يرى فريق مزرعته فقط
✅ لا يستطيع الوصول إلى فريق مزرعة أخرى
✅ يمكنه إضافة/حذف أعضاء فريقه فقط

---

## SQL Queries للتحقق السريع

### 1. عرض جميع أعضاء فريق مزرعة محددة

```sql
SELECT
  ps.name,
  ps.staff_code,
  ps.phone,
  aa.authority_role,
  arc.role_name_ar,
  aa.status,
  aa.assigned_at
FROM platform_staff ps
JOIN authority_assignments aa ON aa.staff_id = ps.id
LEFT JOIN authority_roles_catalog arc ON arc.role_code = aa.authority_role
WHERE aa.scope_type = 'farm'
  AND aa.scope_farm_id = '[farmIdA UUID]'
  AND aa.status = 'active'
ORDER BY aa.assigned_at DESC;
```

### 2. عرض جميع الدعوات المعلقة لمزرعة محددة

```sql
SELECT
  ai.invitee_name,
  ai.invitee_phone,
  ai.authority_role,
  arc.role_name_ar,
  ai.invite_code,
  ai.created_at,
  ai.expires_at,
  ai.status
FROM authority_invitations ai
LEFT JOIN authority_roles_catalog arc ON arc.role_code = ai.authority_role
WHERE ai.scope_type = 'farm'
  AND ai.scope_farm_id = '[farmIdA UUID]'
  AND ai.status = 'invited'
ORDER BY ai.created_at DESC;
```

### 3. التحقق من عدم وجود تداخل بين المزارع

```sql
-- يجب أن يُرجع 0 rows
SELECT *
FROM authority_assignments aa1
JOIN authority_assignments aa2 ON aa2.staff_id = aa1.staff_id
WHERE aa1.scope_farm_id = '[farmIdA UUID]'
  AND aa2.scope_farm_id = '[farmIdB UUID]'
  AND aa1.scope_type = 'farm'
  AND aa2.scope_type = 'farm'
  AND aa1.status = 'active'
  AND aa2.status = 'active';
```

**إذا أرجع نتائج:** هناك موظف معيّن لمزرعتين في نفس الوقت (خطأ!)

### 4. إحصائيات أعضاء الفريق لكل مزرعة

```sql
SELECT
  bf.name AS farm_name,
  COUNT(aa.id) AS team_members_count,
  COUNT(CASE WHEN aa.status = 'active' THEN 1 END) AS active_members
FROM b2f_farms bf
LEFT JOIN authority_assignments aa ON aa.scope_farm_id = bf.id AND aa.scope_type = 'farm'
GROUP BY bf.id, bf.name
ORDER BY active_members DESC;
```

---

## الخلاصة

### ✅ يجب أن تنجح جميع الاختبارات

إذا نجحت جميع الاختبارات:
- ✅ العزل بين المزارع يعمل بشكل صحيح
- ✅ نظام الدعوات يعمل مع scope=farm
- ✅ الأدوار محددة بشكل صحيح
- ✅ RLS policies تعمل بكفاءة
- ✅ المرحلة 3 مكتملة 100%

### ❌ في حالة فشل أي اختبار

راجع:
1. `authority_assignments` - التأكد من scope_farm_id صحيح
2. `authority_invitations` - التأكد من scope_farm_id صحيح
3. RLS policies - التأكد من عدم تسريب بيانات بين المزارع
4. InviteAssignModal - التأكد من تمرير farmId بشكل صحيح
5. FarmTeamManagement - التأكد من فلترة البيانات حسب farmId

---

## النقاط الحرجة (Critical Points)

### 🔴 عزل البيانات
**الأهم على الإطلاق:** لا يجب أن يظهر موظف مزرعة A في مزرعة B **أبداً**.

### 🔴 scope_farm_id
يجب أن يكون **دائماً** محدد في:
- `authority_invitations` - عند إنشاء الدعوة
- `authority_assignments` - عند قبول الدعوة

### 🔴 الاستعلامات (Queries)
كل استعلام يجب أن يحتوي على:
```sql
WHERE scope_farm_id = '[farmId]'
  AND scope_type = 'farm'
```

---

**اختبار سعيد!** 🎉
