/*
  # تحديث قيود إشعارات الزوار

  1. التغييرات
    - تحديث قيد type ليتطابق مع قيم الكود
    - القيم الجديدة: announcement, offer, update, event, system
    
  2. الأمان
    - RLS السياسات موجودة مسبقاً
*/

-- حذف القيد القديم
ALTER TABLE b2f_guest_notifications 
  DROP CONSTRAINT IF EXISTS b2f_guest_notifications_type_check;

-- إضافة القيد الجديد بالقيم الصحيحة
ALTER TABLE b2f_guest_notifications 
  ADD CONSTRAINT b2f_guest_notifications_type_check 
  CHECK (type IN ('announcement', 'offer', 'update', 'event', 'system', 'news', 'welcome', 'opportunity'));
