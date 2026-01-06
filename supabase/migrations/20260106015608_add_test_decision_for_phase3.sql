/*
  # اختبار المرحلة 3: إضافة قرار اختبار من B2F

  ## الهدف
  إضافة قرار واحد للاختبار من نظام المزارع (B2F)
  
  ## البيانات المضافة
  - قرار اعتماد مصروف من B2F
*/

-- إضافة قرار اختبار من B2F
INSERT INTO decision_queue (
  decision_type,
  farm_id,
  expense_amount,
  expense_description,
  status,
  priority,
  notes,
  action_data
)
SELECT
  'approve_expense',
  (SELECT id FROM b2f_farms LIMIT 1),
  5000.00,
  'شراء معدات صيانة للمزرعة',
  'pending',
  'high',
  'مصروف عاجل لصيانة نظام الري',
  jsonb_build_object(
    'expense_type', 'maintenance',
    'expected_delivery', '2026-01-10'
  )
WHERE EXISTS (SELECT 1 FROM b2f_farms LIMIT 1);

-- إضافة قرار اختبار ثاني من B2B
INSERT INTO b2b_decision_queue (
  decision_type,
  auction_id,
  auction_title,
  status,
  priority,
  notes,
  action_data
)
SELECT
  'extend_auction',
  (SELECT id FROM auctions WHERE status = 'active' LIMIT 1),
  'تمديد مزاد معدات زراعية',
  'pending',
  'normal',
  'طلب تمديد المزاد 48 ساعة إضافية',
  jsonb_build_object(
    'extension_hours', 48,
    'reason', 'طلبات عديدة من المشترين'
  )
WHERE EXISTS (SELECT 1 FROM auctions WHERE status = 'active' LIMIT 1);
