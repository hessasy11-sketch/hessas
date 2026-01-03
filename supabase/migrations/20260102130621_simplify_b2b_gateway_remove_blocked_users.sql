/*
  # تبسيط دالة B2B Gateway
  
  إزالة التحقق من المستخدمين المحظورين لأن العمود غير موجود
*/

CREATE OR REPLACE FUNCTION get_b2b_gateway_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reported_auctions integer := 0;
  v_expired_pending integer := 0;
  v_status text;
  v_message text;
  v_priority text;
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NOT NULL AND NOT is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  -- حساب المزادات المُبلغ عنها
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auction_reports') THEN
    SELECT COUNT(*) INTO v_reported_auctions
    FROM auction_reports
    WHERE status = 'pending';
  END IF;

  -- حساب المزادات المنتهية المعلقة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auctions') THEN
    SELECT COUNT(*) INTO v_expired_pending
    FROM auctions
    WHERE ends_at < NOW()
      AND status = 'active';
  END IF;

  -- تحديد الحالة الذكية
  IF v_reported_auctions > 10 OR v_expired_pending > 20 THEN
    v_status := 'critical';
    v_message := 'تدخل مطلوب';
    v_priority := 'high';
  ELSIF v_reported_auctions > 0 OR v_expired_pending > 5 THEN
    v_status := 'warning';
    v_message := 'يحتاج متابعة';
    v_priority := 'medium';
  ELSE
    v_status := 'stable';
    v_message := 'مستقر';
    v_priority := 'low';
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'message', v_message,
    'priority', v_priority,
    'metrics', jsonb_build_object(
      'reported_auctions', v_reported_auctions,
      'expired_pending', v_expired_pending
    )
  );
END;
$$;
