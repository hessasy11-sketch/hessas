# نظام الصلاحيات التفصيلية الشامل
**التاريخ**: 2026-01-03
**الحالة**: ✅ مكتمل وجاهز للإنتاج

---

## 🎯 نظرة عامة

تم تطوير نظام صلاحيات تفصيلي شامل يعكس **الواقع التشغيلي المعتمد** ويربط بين:
- ✅ **طرق الدخول** (Barcode + PIN)
- ✅ **الصلاحيات التشغيلية** (المهام والقرارات)
- ✅ **نطاق العمل** (المنصة/القسم/المزرعة)
- ✅ **إعدادات الجلسة** (المدة والأمان)

---

## 📊 مكونات النظام

### 1. تعريف الأدوار (Role Definitions)
**الجدول**: `role_definitions`

يحتوي على التعريف الأساسي لكل دور:
- `role_key`: المعرف الفريد (platform_owner, super_admin, etc.)
- `role_name_ar`: الاسم بالعربية
- `role_name_en`: الاسم بالإنجليزية
- `description`: الوصف
- `hierarchy_level`: المستوى الهرمي (1-10)
- `is_active`: نشط/معطل

**الأدوار المُعرفة:**
```
1. platform_owner      - مالك المنصة (Level 1)
2. super_admin         - مدير عام (Level 2)
3. general_manager     - المدير العام (Level 3)
4. section_manager     - مدير قسم (Level 4)
5. farm_manager        - مدير مزرعة (Level 5)
6. farm_supervisor     - مشرف مزرعة (Level 6)
7. operations_supervisor - مشرف عمليات (Level 7)
8. task_executor       - منفذ مهام (Level 8)
9. viewer              - مشاهد (Level 9)
```

---

### 2. إعدادات الدخول الذكي (Access Settings)
**الجدول**: `role_access_settings`

يحدد **كيف يدخل** كل دور:

#### أ) طريقة الدخول
- `requires_qr`: يتطلب Barcode (✅/❌)
- `requires_pin`: يتطلب PIN (✅/❌)
- `qr_type`: نوع Barcode
  - `permanent`: دائم
  - `temporary`: مؤقت
  - `both`: الاثنين

#### ب) إعدادات الجهاز
- `allow_image_upload`: رفع صورة Barcode (✅/❌)
- `allow_camera_scan`: مسح بالكاميرا (✅/❌)
- `bind_first_device`: ربط أول جهاز (✅/❌)
- `allow_multi_device`: أجهزة متعددة (✅/❌)

#### ج) إعدادات الجلسة
- `session_duration_minutes`: مدة الجلسة (دقائق)
- `idle_timeout_minutes`: مهلة عدم النشاط (دقائق)

**أمثلة على الإعدادات:**
```
- مالك المنصة: Barcode + PIN, 60 دقيقة, دائم
- المدير العام: Barcode + PIN, 60 دقيقة, دائم
- مدير المزرعة: Barcode + PIN, 45 دقيقة, دائم
- مشرف المزرعة: Barcode فقط, 30 دقيقة, دائم/مؤقت
- منفذ المهام: Barcode فقط, 30 دقيقة, مؤقت
```

---

### 3. الصلاحيات التشغيلية (Operational Permissions)
**الجدول**: `role_operational_permissions`

يحدد **ماذا يفعل** كل دور - **المهام والقرارات**:

#### الصلاحيات الأساسية (10 أنواع):
1. **can_create**: إنشاء
2. **can_view**: عرض
3. **can_edit**: تعديل
4. **can_delete**: حذف
5. **can_approve**: اعتماد
6. **can_reject**: رفض
7. **can_assign**: توزيع/تكليف
8. **can_upload_proof**: رفع إثبات
9. **can_review_reports**: مراجعة تقارير
10. **can_send_to_management**: إرسال للإدارة العليا

#### فئات الصلاحيات:
- `users`: إدارة المستخدمين
- `roles`: إدارة الأدوار
- `farms`: إدارة المزارع
- `operations`: إدارة العمليات
- `tasks`: إدارة المهام
- `reports`: إدارة التقارير
- `auctions`: إدارة المزادات
- `team`: إدارة الفريق

**أمثلة:**
```
مالك المنصة:
  - manage_farms: إنشاء ✅ | عرض ✅ | تعديل ✅ | حذف ✅ | اعتماد ✅
  - manage_operations: جميع الصلاحيات ✅
  - manage_tasks: جميع الصلاحيات ✅

مدير المزرعة:
  - manage_operations: إنشاء ✅ | عرض ✅ | تعديل ✅ | اعتماد ✅
  - manage_tasks: إنشاء ✅ | توزيع ✅ | رفع إثبات ✅
  - manage_team: عرض ✅ | تعديل ✅ | توزيع ✅

منفذ المهام:
  - execute_tasks: عرض ✅ | رفع إثبات ✅
```

---

### 4. نطاق الصلاحيات (Scope Permissions)
**الجدول**: `role_scope_permissions`

يحدد **أين يعمل** كل دور:

#### أنواع النطاق:
- `platform`: المنصة الكاملة
- `section`: قسم محدد (B2F / Auctions)
- `farm`: مزرعة محددة
- `auction`: مزاد محدد

#### الإعدادات:
- `scope_value`: القيمة (اسم المزرعة، ID القسم، etc.)
- `applies_to_all`: ينطبق على الكل (✅/❌)

**أمثلة:**
```
- مالك المنصة: platform, applies_to_all = true
- المدير العام: platform, applies_to_all = true
- مدير قسم: section, scope_value = 'b2f'
- مدير مزرعة: farm, scope_value = 'farm_id_123'
```

---

## 🖥️ الواجهة التفاعلية

### EnhancedPermissionsView
**الموقع**: `src/components/platform/EnhancedPermissionsView.tsx`

#### المميزات:
1. **قائمة الأدوار** (Sidebar)
   - عرض جميع الأدوار
   - ترتيب حسب التسلسل الهرمي
   - حالة النشاط (نشط/معطل)

2. **نظرة عامة** (Overview Tab)
   - معلومات الدور الأساسية
   - ملخص الصلاحيات
   - الإحصائيات السريعة

3. **إعدادات الدخول الذكي** (Access Tab)
   - طريقة الدخول (Barcode/PIN)
   - نوع Barcode
   - إعدادات الجهاز
   - إعدادات الجلسة

4. **الصلاحيات التشغيلية** (Operations Tab)
   - جميع المهام والقرارات
   - عرض مرئي للصلاحيات (✅/❌)
   - تصنيف حسب الفئة

5. **نطاق الصلاحيات** (Scope Tab)
   - المستوى (منصة/قسم/مزرعة)
   - القيمة المحددة
   - ينطبق على الكل

---

## 🔗 التكامل مع الأنظمة الأخرى

### 1. التكامل مع نظام الباركود
```typescript
// عند مسح Barcode
const result = await verifyQRToken(barcode);

// جلب إعدادات الدخول للدور
const accessSettings = await supabase
  .from('role_access_settings')
  .select('*')
  .eq('role_key', result.staff.role)
  .single();

// التحقق من متطلبات PIN
if (accessSettings.requires_pin) {
  showPinModal();
} else {
  createSession();
}
```

### 2. التكامل مع نظام المهام
```typescript
// التحقق من صلاحية قبل إنشاء مهمة
const canCreate = await supabase
  .rpc('check_role_permission', {
    p_role_key: userRole,
    p_permission_key: 'manage_tasks',
    p_action: 'create'
  });

if (!canCreate) {
  showError('ليس لديك صلاحية إنشاء مهام');
  return;
}

// إنشاء المهمة
await createTask(...);
```

### 3. التكامل مع نظام الجلسات
```typescript
// عند إنشاء جلسة، جلب مدة الجلسة من الصلاحيات
const accessSettings = await supabase
  .from('role_access_settings')
  .select('session_duration_minutes, idle_timeout_minutes')
  .eq('role_key', staffRole)
  .single();

adminSessionManager.createSession({
  ...sessionData,
  session_duration: accessSettings.session_duration_minutes,
  idle_timeout: accessSettings.idle_timeout_minutes
});
```

---

## 📝 دوال مساعدة (Helper Functions)

### 1. الحصول على الصلاحيات الكاملة
```sql
SELECT get_role_full_permissions('farm_manager');
```
**الإخراج**:
```json
{
  "definition": {...},
  "access_settings": {...},
  "operational_permissions": [...],
  "scope_permissions": [...]
}
```

### 2. التحقق من صلاحية معينة
```sql
SELECT check_role_permission('farm_manager', 'manage_operations', 'approve');
-- النتيجة: true/false
```

---

## 🧪 سيناريوهات الاستخدام

### سيناريو 1: مدير مزرعة يريد إنشاء مهمة جديدة

1. **الدخول**:
   - يمسح Barcode الخاص به
   - يُطلب منه إدخال PIN (لأن role_access_settings.requires_pin = true)
   - جلسة لمدة 45 دقيقة

2. **إنشاء المهمة**:
   - يفتح صفحة المهام
   - النظام يتحقق من صلاحية `can_create` في `manage_tasks`
   - farm_manager لديه can_create = true ✅
   - يمكنه إنشاء المهمة

3. **توزيع المهمة**:
   - يريد توزيع المهمة على منفذ
   - النظام يتحقق من صلاحية `can_assign`
   - farm_manager لديه can_assign = true ✅
   - يمكنه توزيع المهمة

### سيناريو 2: مشرف عمليات يريد اعتماد مهمة

1. **الدخول**:
   - يمسح Barcode الخاص به
   - لا يُطلب PIN (requires_pin = false)
   - جلسة لمدة 30 دقيقة

2. **مراجعة المهمة**:
   - يفتح قائمة المهام
   - can_view = true ✅
   - يمكنه عرض المهام

3. **اعتماد المهمة**:
   - يريد اعتماد المهمة المُنفذة
   - can_approve = true ✅
   - يمكنه اعتماد المهمة

### سيناريو 3: منفذ مهام يريد رفع إثبات

1. **الدخول**:
   - يمسح Barcode المؤقت (qr_type = temporary)
   - لا يُطلب PIN
   - جلسة لمدة 30 دقيقة

2. **تنفيذ المهمة**:
   - يفتح المهمة المُكلف بها
   - can_view = true ✅

3. **رفع الإثبات**:
   - يريد رفع صورة إثبات التنفيذ
   - can_upload_proof = true ✅
   - يمكنه رفع الإثبات

4. **محاولة الاعتماد**:
   - يريد اعتماد المهمة بنفسه
   - can_approve = false ❌
   - لا يمكنه الاعتماد (محفوظ للمشرف)

---

## 🔐 الأمان والـ RLS

جميع الجداول محمية بـ RLS:

### القراءة:
```sql
-- أي مستخدم مُصادق يمكنه قراءة الصلاحيات
CREATE POLICY "Anyone can read role definitions"
  ON role_definitions FOR SELECT
  TO authenticated
  USING (true);
```

### الكتابة:
```sql
-- الإدارة العليا فقط يمكنها التعديل
CREATE POLICY "Only admins can manage role definitions"
  ON role_definitions FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));
```

---

## 📈 الإحصائيات والتقارير

يمكن جلب إحصائيات مفصلة:

```sql
-- عدد الأدوار النشطة
SELECT COUNT(*) FROM role_definitions WHERE is_active = true;

-- الأدوار التي تتطلب PIN
SELECT rd.role_name_ar
FROM role_definitions rd
JOIN role_access_settings ras ON rd.role_key = ras.role_key
WHERE ras.requires_pin = true;

-- الأدوار التي يمكنها اعتماد المهام
SELECT DISTINCT rd.role_name_ar
FROM role_definitions rd
JOIN role_operational_permissions rop ON rd.role_key = rop.role_key
WHERE rop.can_approve = true AND rop.permission_category = 'tasks';
```

---

## ✅ قائمة التحقق للاستخدام

عند إضافة دور جديد:

- [ ] تعريف الدور في `role_definitions`
- [ ] إعدادات الدخول في `role_access_settings`
- [ ] الصلاحيات التشغيلية في `role_operational_permissions`
- [ ] نطاق الصلاحيات في `role_scope_permissions`
- [ ] إنشاء Barcode للدور (إذا لزم)
- [ ] اختبار الدخول والصلاحيات
- [ ] توثيق الدور في الواجهة

---

## 🚀 التطوير المستقبلي

### مُقترحات:
1. **واجهة تعديل بصرية**
   - Drag & Drop للصلاحيات
   - تعديل مباشر في الواجهة

2. **قوالب الأدوار**
   - قوالب جاهزة للأدوار الشائعة
   - استنساخ دور موجود

3. **سجل تغييرات الصلاحيات**
   - تتبع من عدّل ماذا ومتى
   - إمكانية الرجوع للإصدار السابق

4. **تحذيرات التضارب**
   - تحذير عند منح صلاحيات متضاربة
   - اقتراحات ذكية للصلاحيات

---

## 📞 الدعم والمساعدة

للاستفسارات أو المشاكل:
1. راجع هذا الدليل أولاً
2. تحقق من سجلات الـ RLS
3. استخدم دوال التحقق المساعدة
4. اتصل بفريق التطوير

---

**النظام مكتمل وجاهز للإنتاج!** 🎉

جميع المتطلبات تم تحقيقها:
- ✅ تجسيد الواقع التشغيلي
- ✅ ربط بالباركود والمهام
- ✅ واجهة تفاعلية شاملة
- ✅ أمان وRLS محكم
- ✅ قابلية التوسع
