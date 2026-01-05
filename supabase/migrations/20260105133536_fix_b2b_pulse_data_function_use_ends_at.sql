/*
  # إصلاح دالة B2B Pulse لاستخدام ends_at

  تحديث دالة `get_b2b_pulse_data` لاستخدام العمود الصحيح:
  - استبدال `end_time` بـ `ends_at`

  هذا يصلح الخطأ:
  column "end_time" does not exist
*/

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_b2b_pulse_data();

-- إعادة إنشاء الدالة بالعمود الصحيح
CREATE OR REPLACE FUNCTION get_b2b_pulse_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_auctions_count integer;
  total_bids_count integer;
  ending_soon_count integer;
  completed_today_count integer;
  critical_alerts_count integer;
BEGIN
  -- عدد المزادات النشطة
  SELECT COUNT(*)
  INTO active_auctions_count
  FROM auctions
  WHERE status = 'active'
    AND ends_at > NOW();

  -- عدد المزايدات اليوم (dummy data for now)
  total_bids_count := 0;

  -- عدد المزادات التي تنتهي خلال 24 ساعة
  SELECT COUNT(*)
  INTO ending_soon_count
  FROM auctions
  WHERE status = 'active'
    AND ends_at > NOW()
    AND ends_at < NOW() + INTERVAL '24 hours';

  -- عدد المزادات المكتملة اليوم
  SELECT COUNT(*)
  INTO completed_today_count
  FROM auctions
  WHERE status IN ('sold', 'completed')
    AND updated_at::date = CURRENT_DATE;

  -- التنبيهات الحرجة (مزادات تنتهي قريباً)
  SELECT COUNT(*)
  INTO critical_alerts_count
  FROM auctions
  WHERE status = 'active'
    AND ends_at < NOW() + INTERVAL '6 hours'
    AND ends_at > NOW();

  RETURN jsonb_build_object(
    'active_auctions', active_auctions_count,
    'total_bids', total_bids_count,
    'ending_soon', ending_soon_count,
    'completed_today', completed_today_count,
    'critical_alerts', critical_alerts_count
  );
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION get_b2b_pulse_data TO anon, authenticated;
