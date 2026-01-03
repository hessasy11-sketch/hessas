/*
  # إصلاح دقة عمود ai_confidence_score مع الـ views

  1. المشكلة
    - العمود محدد بـ NUMERIC(3,2)
    - views تعتمد على العمود

  2. الإصلاح
    - حذف الـ views المعتمدة
    - تغيير نوع العمود
    - إعادة إنشاء الـ views
*/

-- حذف الـ views المعتمدة
DROP VIEW IF EXISTS finance_auto_approved_queue CASCADE;
DROP VIEW IF EXISTS finance_auto_rejected_queue CASCADE;
DROP VIEW IF EXISTS finance_pending_review_queue CASCADE;

-- تغيير نوع العمود
ALTER TABLE b2f_sales_requests 
ALTER COLUMN ai_confidence_score TYPE NUMERIC(5,2);

-- إعادة إنشاء الـ views
CREATE OR REPLACE VIEW finance_auto_approved_queue AS
SELECT 
  id,
  investor_name,
  investor_phone,
  total_amount,
  number_of_trees,
  tree_type,
  status,
  ai_verification_status,
  ai_confidence_score,
  ai_verification_notes,
  ai_verified_at,
  created_at
FROM b2f_sales_requests
WHERE status = 'auto_approved'
ORDER BY ai_verified_at DESC;

CREATE OR REPLACE VIEW finance_auto_rejected_queue AS
SELECT 
  id,
  investor_name,
  investor_phone,
  total_amount,
  number_of_trees,
  tree_type,
  status,
  ai_verification_status,
  ai_confidence_score,
  rejection_reason,
  ai_verification_notes,
  ai_verified_at,
  created_at
FROM b2f_sales_requests
WHERE status = 'auto_rejected'
ORDER BY ai_verified_at DESC;
