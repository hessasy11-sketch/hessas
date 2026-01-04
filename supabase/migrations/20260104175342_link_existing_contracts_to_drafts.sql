/*
  # ربط العقود الموجودة بمساودتها

  1. التحديثات
    - ربط العقود الموجودة بمساودتها بناءً على البيانات
    - تحديث حالة المسودات المرتبطة
*/

-- ربط العقود الموجودة بمساودتها
UPDATE b2f_contracts c
SET draft_id = d.id
FROM b2f_contract_drafts d
WHERE c.draft_id IS NULL
  AND c.investor_phone = d.investor_phone
  AND c.trees_count = d.trees_count
  AND c.total_amount = d.total_amount
  AND c.duration_months = d.duration_months
  AND ABS(EXTRACT(EPOCH FROM (c.created_at - d.created_at))) < 3600; -- خلال ساعة واحدة من إنشاء المسودة