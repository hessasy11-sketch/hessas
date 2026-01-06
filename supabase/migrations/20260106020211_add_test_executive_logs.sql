/*
  # بيانات اختبار للسجل القيادي

  ## الهدف
  إضافة سجلات اختبار للتحقق من السجل القيادي

  ## البيانات المضافة
  - 3 سجلات من B2F (قرارات معتمدة، مرفوضة، تعيين)
  - 2 سجل من B2B (مزاد موقف، مزاد ممدد)
*/

-- إضافة سجلات B2F
INSERT INTO executive_logs (
  action_type,
  farm_id,
  decision_id,
  performed_by,
  result,
  notes,
  action_data
)
SELECT
  'decision_approved',
  (SELECT id FROM b2f_farms LIMIT 1),
  (SELECT id FROM decision_queue WHERE status = 'pending' LIMIT 1),
  NULL,
  'success',
  'تم اعتماد المصروف بنجاح',
  jsonb_build_object(
    'approved_amount', 5000,
    'approval_notes', 'معتمد للصيانة العاجلة'
  )
WHERE EXISTS (SELECT 1 FROM b2f_farms LIMIT 1)
  AND EXISTS (SELECT 1 FROM decision_queue WHERE status = 'pending' LIMIT 1);

INSERT INTO executive_logs (
  action_type,
  farm_id,
  performed_by,
  result,
  notes,
  action_data
)
SELECT
  'farm_locked',
  (SELECT id FROM b2f_farms LIMIT 1),
  NULL,
  'success',
  'تم إيقاف المزرعة مؤقتاً للصيانة',
  jsonb_build_object(
    'reason', 'maintenance',
    'expected_duration_days', 7
  )
WHERE EXISTS (SELECT 1 FROM b2f_farms LIMIT 1);

INSERT INTO executive_logs (
  action_type,
  farm_id,
  performed_by,
  result,
  notes,
  action_data
)
SELECT
  'farm_unlocked',
  (SELECT id FROM b2f_farms LIMIT 1),
  NULL,
  'success',
  'تم تفعيل المزرعة بعد انتهاء الصيانة',
  jsonb_build_object(
    'reason', 'maintenance_complete'
  )
WHERE EXISTS (SELECT 1 FROM b2f_farms LIMIT 1);

-- إضافة سجلات B2B
INSERT INTO b2b_executive_logs (
  action_type,
  auction_id,
  decision_id,
  performed_by,
  result,
  notes,
  action_data
)
SELECT
  'auction_paused',
  (SELECT id FROM auctions WHERE status = 'active' LIMIT 1),
  (SELECT id FROM b2b_decision_queue WHERE status = 'pending' LIMIT 1),
  NULL,
  'success',
  'تم إيقاف المزاد مؤقتاً للمراجعة',
  jsonb_build_object(
    'reason', 'review_required',
    'pause_duration_hours', 24
  )
WHERE EXISTS (SELECT 1 FROM auctions WHERE status = 'active' LIMIT 1)
  AND EXISTS (SELECT 1 FROM b2b_decision_queue WHERE status = 'pending' LIMIT 1);

INSERT INTO b2b_executive_logs (
  action_type,
  auction_id,
  decision_id,
  performed_by,
  result,
  notes,
  action_data
)
SELECT
  'auction_extended',
  (SELECT id FROM auctions WHERE status = 'active' LIMIT 1),
  (SELECT id FROM b2b_decision_queue WHERE status = 'pending' LIMIT 1),
  NULL,
  'success',
  'تم تمديد وقت المزاد 48 ساعة إضافية',
  jsonb_build_object(
    'extension_hours', 48,
    'reason', 'high_bidder_interest'
  )
WHERE EXISTS (SELECT 1 FROM auctions WHERE status = 'active' LIMIT 1)
  AND EXISTS (SELECT 1 FROM b2b_decision_queue WHERE status = 'pending' LIMIT 1);

INSERT INTO b2b_executive_logs (
  action_type,
  auction_id,
  performed_by,
  result,
  notes,
  action_data
)
SELECT
  'auction_activated',
  (SELECT id FROM auctions WHERE status = 'active' LIMIT 1),
  NULL,
  'success',
  'تم تفعيل المزاد بعد المراجعة',
  jsonb_build_object(
    'review_status', 'approved',
    'reviewer_notes', 'جميع الشروط مستوفاة'
  )
WHERE EXISTS (SELECT 1 FROM auctions WHERE status = 'active' LIMIT 1);
