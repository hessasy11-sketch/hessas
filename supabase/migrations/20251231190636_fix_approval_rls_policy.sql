/*
  # إصلاح RLS policy لاعتماد الإيصالات

  1. Changes
    - إضافة policy جديدة للسماح لـ anon باعتماد الإيصالات المقبولة آلياً
    - هذا يحل مشكلة عدم استجابة زر الاعتماد

  2. Security
    - السماح بالتحديث فقط للإيصالات ذات الحالة auto_approved أو auto_rejected
    - السماح بالتحديث إلى الحالات: approved, rejected, auto_approved فقط
*/

-- حذف policy القديمة إن وجدت
DROP POLICY IF EXISTS "Allow anon to approve auto-approved receipts" ON b2f_sales_requests;

-- إضافة policy جديدة
CREATE POLICY "Allow anon to approve auto-approved receipts"
ON b2f_sales_requests
FOR UPDATE
TO anon
USING (status IN ('auto_approved', 'auto_rejected'))
WITH CHECK (status IN ('approved', 'rejected', 'auto_approved'));
