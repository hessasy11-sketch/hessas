/*
  # إزالة سياسة الوصول الكامل لـ service_role من executive_logs
  
  لضمان أن السجل التنفيذي غير قابل للتعديل حتى من service_role
*/

-- حذف السياسة القديمة التي تسمح بالوصول الكامل
DROP POLICY IF EXISTS "Allow service role full access to executive_logs" ON executive_logs;

-- التأكد من أن السياسة المتبقية للقراءة فقط
-- السياسات الموجودة:
-- 1. "Allow read access to executive logs" - للقراءة
-- 2. "Prevent updates on executive logs" - منع التحديث
-- 3. "Prevent deletes on executive logs" - منع الحذف
