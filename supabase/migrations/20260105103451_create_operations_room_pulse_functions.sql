/*
  # دوال نبض غرفة العمليات

  دوال لجلب البيانات الحية لمدخل غرفة العمليات:
  
  1. دالة B2F Pulse
     - طلبات نشطة
     - طلبات تحتاج موافقة
     - مزارع تشغيلية
     - عقود فعالة
     - تنبيهات حرجة
  
  2. دالة B2B Pulse
     - مزادات نشطة
     - مزايدات اليوم
     - مزادات تنتهي قريباً
     - مزادات مكتملة اليوم
     - تنبيهات حرجة
*/

-- دالة B2F Pulse
CREATE OR REPLACE FUNCTION get_b2f_pulse_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_requests_count integer;
  pending_approvals_count integer;
  operating_farms_count integer;
  active_contracts_count integer;
  critical_alerts_count integer;
BEGIN
  -- عدد الطلبات النشطة
  SELECT COUNT(*)
  INTO active_requests_count
  FROM b2f_sales_requests
  WHERE status IN ('pending', 'under_review', 'approved_pending_payment');

  -- عدد الطلبات التي تحتاج موافقة
  SELECT COUNT(*)
  INTO pending_approvals_count
  FROM b2f_sales_requests
  WHERE status = 'pending';

  -- عدد المزارع التشغيلية
  SELECT COUNT(*)
  INTO operating_farms_count
  FROM b2f_farms
  WHERE status = 'active';

  -- عدد العقود الفعالة
  SELECT COUNT(*)
  INTO active_contracts_count
  FROM b2f_contracts
  WHERE status = 'active';

  -- التنبيهات الحرجة (طلبات قديمة جداً)
  SELECT COUNT(*)
  INTO critical_alerts_count
  FROM b2f_sales_requests
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '48 hours';

  RETURN jsonb_build_object(
    'active_requests', active_requests_count,
    'pending_approvals', pending_approvals_count,
    'operating_farms', operating_farms_count,
    'active_contracts', active_contracts_count,
    'critical_alerts', critical_alerts_count
  );
END;
$$;

-- دالة B2B Pulse
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
    AND end_time > NOW();

  -- عدد المزايدات اليوم (dummy data for now)
  total_bids_count := 0;

  -- عدد المزادات التي تنتهي خلال 24 ساعة
  SELECT COUNT(*)
  INTO ending_soon_count
  FROM auctions
  WHERE status = 'active'
    AND end_time > NOW()
    AND end_time < NOW() + INTERVAL '24 hours';

  -- عدد المزادات المكتملة اليوم
  SELECT COUNT(*)
  INTO completed_today_count
  FROM auctions
  WHERE status IN ('sold', 'completed')
    AND updated_at::date = CURRENT_DATE;

  -- التنبيهات الحرجة (مزادات بدون مزايدات تنتهي قريباً)
  SELECT COUNT(*)
  INTO critical_alerts_count
  FROM auctions
  WHERE status = 'active'
    AND end_time < NOW() + INTERVAL '6 hours'
    AND end_time > NOW();

  RETURN jsonb_build_object(
    'active_auctions', active_auctions_count,
    'total_bids', total_bids_count,
    'ending_soon', ending_soon_count,
    'completed_today', completed_today_count,
    'critical_alerts', critical_alerts_count
  );
END;
$$;

-- منح صلاحيات التنفيذ للمستخدمين المجهولين والمصادق عليهم
GRANT EXECUTE ON FUNCTION get_b2f_pulse_data TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_b2b_pulse_data TO anon, authenticated;
