/*
  ════════════════════════════════════════════════════════════════
  📋 مثال عملي: إضافة دور "محاسب مالي" (Financial Accountant)
  ════════════════════════════════════════════════════════════════

  هذا مثال توضيحي كامل لإضافة دور جديد في النظام.
  يمكنك نسخ هذا الملف وتعديله حسب احتياجك.
*/

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ الخطوة الأولى: تعريف الدور
-- ═══════════════════════════════════════════════════════════════

INSERT INTO role_definitions (
  role_key,           -- المفتاح الفريد (إنجليزي، صغير، بدون مسافات)
  role_name_ar,       -- الاسم بالعربية
  role_name_en,       -- الاسم بالإنجليزية
  description,        -- وصف الدور
  hierarchy_level,    -- المستوى الهرمي (1 أعلى، 10 أقل)
  is_active          -- هل الدور نشط؟
)
VALUES (
  'financial_accountant',
  'محاسب مالي',
  'Financial Accountant',
  'مسؤول عن مراجعة واعتماد المدفوعات والإيصالات المالية',
  6,
  true
)
ON CONFLICT (role_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ الخطوة الثانية: إعدادات الدخول والأمان
-- ═══════════════════════════════════════════════════════════════

INSERT INTO role_access_settings (
  role_key,
  requires_qr,              -- يحتاج QR للدخول؟ (true/false)
  requires_pin,             -- يحتاج PIN للأمان؟ (true/false)
  allow_image_upload,       -- السماح برفع صورة QR؟
  allow_camera_scan,        -- السماح بمسح QR بالكاميرا؟
  bind_first_device,        -- ربط بأول جهاز فقط؟
  session_duration_minutes, -- مدة الجلسة بالدقائق
  idle_timeout_minutes,     -- وقت عدم النشاط قبل إنهاء الجلسة
  allow_multi_device,       -- السماح بالدخول من أجهزة متعددة؟
  qr_type                  -- نوع QR: permanent (دائم) / temporary (مؤقت) / both
)
VALUES (
  'financial_accountant',
  true,          -- ✅ يحتاج QR
  true,          -- ✅ يحتاج PIN (لأنه دور حساس)
  true,          -- يمكن رفع صورة QR
  true,          -- يمكن مسح QR بالكاميرا
  false,         -- لا يُربط بجهاز واحد
  45,           -- جلسة مدتها 45 دقيقة
  30,           -- انتهاء بعد 30 دقيقة عدم نشاط
  false,         -- جهاز واحد فقط في نفس الوقت
  'permanent'   -- QR دائم (غير مؤقت)
)
ON CONFLICT (role_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ الخطوة الثالثة: الصلاحيات التشغيلية
-- ═══════════════════════════════════════════════════════════════

/*
  شرح الأعمدة:
  - can_create: يمكنه إنشاء سجلات جديدة
  - can_view: يمكنه عرض/قراءة البيانات
  - can_edit: يمكنه تعديل السجلات
  - can_delete: يمكنه حذف السجلات
  - can_approve: يمكنه اعتماد/الموافقة
  - can_reject: يمكنه رفض الطلبات
  - can_assign: يمكنه تعيين المهام للآخرين
  - can_upload_proof: يمكنه رفع إثباتات/مستندات
  - can_review_reports: يمكنه مراجعة التقارير
  - can_send_to_management: يمكنه إرسال للإدارة العليا
*/

-- صلاحية 1: إدارة المدفوعات
INSERT INTO role_operational_permissions (
  role_key,
  permission_key,
  permission_name_ar,
  permission_category,
  can_create,
  can_view,
  can_edit,
  can_delete,
  can_approve,
  can_reject,
  can_assign,
  can_upload_proof,
  can_review_reports,
  can_send_to_management
)
VALUES (
  'financial_accountant',
  'manage_payments',
  'إدارة المدفوعات',
  'finance',
  false,  -- ❌ لا يمكنه إنشاء مدفوعات (يتم إنشاؤها من الأقسام الأخرى)
  true,   -- ✅ يمكنه عرض جميع المدفوعات
  false,  -- ❌ لا يمكنه تعديل (فقط اعتماد/رفض)
  false,  -- ❌ لا يمكنه الحذف
  true,   -- ✅ يمكنه اعتماد المدفوعات
  true,   -- ✅ يمكنه رفض المدفوعات
  false,  -- ❌ لا يعيّن مهام
  false,  -- ❌ لا يرفع إثباتات (يراجعها فقط)
  false,  -- ❌ لا يراجع تقارير
  false   -- ❌ لا يرسل للإدارة
)
ON CONFLICT (role_key, permission_key) DO NOTHING;

-- صلاحية 2: مراجعة الإيصالات
INSERT INTO role_operational_permissions (
  role_key,
  permission_key,
  permission_name_ar,
  permission_category,
  can_create, can_view, can_edit, can_delete, can_approve, can_reject,
  can_assign, can_upload_proof, can_review_reports, can_send_to_management
)
VALUES (
  'financial_accountant',
  'review_receipts',
  'مراجعة الإيصالات',
  'finance',
  false, true, false, false, true, true,
  false, false, false, false
)
ON CONFLICT (role_key, permission_key) DO NOTHING;

-- صلاحية 3: إنشاء التقارير المالية
INSERT INTO role_operational_permissions (
  role_key, permission_key, permission_name_ar, permission_category,
  can_create, can_view, can_edit, can_delete, can_approve, can_reject,
  can_assign, can_upload_proof, can_review_reports, can_send_to_management
)
VALUES (
  'financial_accountant',
  'financial_reports',
  'التقارير المالية',
  'reports',
  true,   -- ✅ يمكنه إنشاء تقارير مالية
  true,   -- ✅ يمكنه عرض التقارير
  true,   -- ✅ يمكنه تعديل تقاريره
  false,  -- ❌ لا يمكنه الحذف
  false, false, false, false, false,
  true    -- ✅ يمكنه إرسال التقارير للإدارة
)
ON CONFLICT (role_key, permission_key) DO NOTHING;

-- صلاحية 4: عرض العمليات (للمراجعة فقط)
INSERT INTO role_operational_permissions (
  role_key, permission_key, permission_name_ar, permission_category,
  can_create, can_view, can_edit, can_delete, can_approve, can_reject,
  can_assign, can_upload_proof, can_review_reports, can_send_to_management
)
VALUES (
  'financial_accountant',
  'view_operations',
  'عرض العمليات',
  'operations',
  false, true, false, false, false, false,
  false, false, false, false
)
ON CONFLICT (role_key, permission_key) DO NOTHING;

-- صلاحية 5: إدارة الفواتير
INSERT INTO role_operational_permissions (
  role_key, permission_key, permission_name_ar, permission_category,
  can_create, can_view, can_edit, can_delete, can_approve, can_reject,
  can_assign, can_upload_proof, can_review_reports, can_send_to_management
)
VALUES (
  'financial_accountant',
  'manage_invoices',
  'إدارة الفواتير',
  'finance',
  true,   -- ✅ يمكنه إنشاء فواتير
  true,   -- ✅ يمكنه عرض الفواتير
  true,   -- ✅ يمكنه تعديل الفواتير
  false,  -- ❌ لا يمكنه حذف الفواتير
  true,   -- ✅ يمكنه اعتماد الفواتير
  false, false, false, false, false
)
ON CONFLICT (role_key, permission_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ الخطوة الرابعة: تحديد نطاق الصلاحيات
-- ═══════════════════════════════════════════════════════════════

/*
  نطاق الصلاحيات يحدد "أين" يستطيع الموظف العمل:

  - scope_type = 'platform' → على مستوى المنصة كاملة
  - scope_type = 'section' → على مستوى قسم محدد (b2b, b2f, hq)
  - scope_type = 'farm' → على مستوى مزرعة محددة
  - scope_type = 'auction' → على مستوى مزاد محدد

  - applies_to_all = true → ينطبق على الكل
  - scope_value → قيمة محددة (مثلاً: 'b2f')
*/

-- المحاسب يعمل على مستوى المنصة كاملة
INSERT INTO role_scope_permissions (
  role_key,
  scope_type,
  scope_value,
  applies_to_all
)
VALUES
  -- يمكنه الوصول لكل أقسام المنصة
  ('financial_accountant', 'platform', NULL, true)
ON CONFLICT (role_key, scope_type, scope_value) DO NOTHING;

-- إذا أردت تحديد نطاق لقسم واحد فقط:
-- INSERT INTO role_scope_permissions (role_key, scope_type, scope_value, applies_to_all)
-- VALUES ('financial_accountant', 'section', 'b2f', false);

-- ═══════════════════════════════════════════════════════════════
-- ✅ تم! الآن يمكنك إضافة موظف بهذا الدور
-- ═══════════════════════════════════════════════════════════════

/*
  للتحقق من النجاح، شغل هذه الاستعلامات:

  -- 1. التحقق من التعريف
  SELECT * FROM role_definitions WHERE role_key = 'financial_accountant';

  -- 2. التحقق من إعدادات الدخول
  SELECT * FROM role_access_settings WHERE role_key = 'financial_accountant';

  -- 3. التحقق من الصلاحيات
  SELECT * FROM role_operational_permissions WHERE role_key = 'financial_accountant';

  -- 4. التحقق من النطاق
  SELECT * FROM role_scope_permissions WHERE role_key = 'financial_accountant';

  -- 5. الحصول على كل شيء دفعة واحدة
  SELECT * FROM get_role_full_permissions('financial_accountant');
*/

-- ═══════════════════════════════════════════════════════════════
-- 📝 ملاحظات مهمة
-- ═══════════════════════════════════════════════════════════════

/*
  1. المفاتيح (Keys):
     - يجب أن تكون بالإنجليزية فقط
     - أحرف صغيرة (lowercase)
     - استخدم _ بدلاً من المسافات
     - مثال صحيح: 'financial_accountant'
     - مثال خاطئ: 'Financial Accountant' أو 'محاسب مالي'

  2. الفئات (Categories):
     users, roles, farms, operations, tasks, reports,
     auctions, finance, team, general, inventory, supplies

  3. المستوى الهرمي (Hierarchy):
     1 = platform_owner (أعلى صلاحية)
     2 = super_admin
     3 = general_manager
     4-10 = أدوار أخرى (كلما زاد الرقم قلت الصلاحيات)

  4. نوع QR:
     - 'permanent' = QR دائم (لا ينتهي)
     - 'temporary' = QR مؤقت (ينتهي بعد فترة)
     - 'both' = يمكن استخدام النوعين

  5. الأمان:
     - الأدوار الحساسة يجب أن يكون لها PIN
     - requires_pin = true للأدوار المالية والإدارية
     - session_duration قصيرة للأدوار الحساسة (30-45 دقيقة)
*/
