/*
  # إضافة الأدوار المخصصة لنظام الصلاحيات
  
  تحديث الصلاحيات الافتراضية لاستخدام الأدوار الموجودة في النظام
*/

-- حذف الصلاحيات القديمة
DELETE FROM decision_authorities;

-- إضافة الصلاحيات باستخدام الأدوار الموجودة
INSERT INTO decision_authorities (decision_type, allowed_role, conditions, description_ar, description_en) VALUES
  -- إيقاف مزرعة → GM فقط
  ('suspend_bookings', 'super_admin', '{}', 'المدير العام فقط يمكنه إيقاف المزارع', 'Only GM can suspend farms'),
  
  -- اعتماد مصروف صغير (< 5000) → مدير المزارع + GM
  ('approve_expense', 'farms_manager', '{"max_amount": 5000}', 'مدير المزارع يمكنه اعتماد المصروفات حتى 5000 ر.س', 'Farms Manager can approve expenses up to 5000 SAR'),
  ('approve_expense', 'super_admin', '{}', 'المدير العام يمكنه اعتماد أي مصروف', 'GM can approve any expense'),
  
  -- تغيير مدير مزرعة → GM فقط
  ('change_farm_manager', 'super_admin', '{}', 'المدير العام فقط يمكنه تغيير مديري المزارع', 'Only GM can change farm managers'),
  
  -- إلغاء مزاد → GM + مسؤول
  ('cancel_auction', 'super_admin', '{}', 'المدير العام يمكنه إلغاء أي مزاد', 'GM can cancel any auction'),
  ('cancel_auction', 'admin', '{}', 'المسؤول يمكنه إلغاء المزادات', 'Admin can cancel auctions')
ON CONFLICT (decision_type, allowed_role, conditions) DO NOTHING;
