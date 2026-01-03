/*
  # تصحيح أسماء أعمدة جدول auctions في دوال لوحة القرار
  
  تحديث استخدام end_date و start_date إلى ends_at و starts_at
*/

-- =====================================================
-- تصحيح دالة B2B Gateway
-- =====================================================

CREATE OR REPLACE FUNCTION get_b2b_gateway_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reported_auctions integer := 0;
  v_expired_pending integer := 0;
  v_blocked_users integer := 0;
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

  -- حساب المزادات المنتهية المعلقة (تصحيح اسم العمود)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auctions') THEN
    SELECT COUNT(*) INTO v_expired_pending
    FROM auctions
    WHERE ends_at < NOW()
      AND status = 'active';
  END IF;

  -- حساب المستخدمين المحظورين مؤقتاً
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    SELECT COUNT(*) INTO v_blocked_users
    FROM profiles
    WHERE is_blocked = true
      AND block_expires_at IS NOT NULL
      AND block_expires_at > NOW();
  END IF;

  -- تحديد الحالة الذكية
  IF v_reported_auctions > 10 OR v_expired_pending > 20 THEN
    v_status := 'critical';
    v_message := 'تدخل مطلوب';
    v_priority := 'high';
  ELSIF v_reported_auctions > 0 OR v_expired_pending > 5 OR v_blocked_users > 0 THEN
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
      'expired_pending', v_expired_pending,
      'blocked_users', v_blocked_users
    )
  );
END;
$$;

-- =====================================================
-- تصحيح دالة System Pulse
-- =====================================================

CREATE OR REPLACE FUNCTION get_system_pulse()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operations_status text;
  v_documentation_count integer := 0;
  v_service_count integer := 0;
  v_active_farms integer := 0;
  v_active_auctions integer := 0;
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NOT NULL AND NOT is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  -- حالة التشغيل
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'farm_tasks') THEN
    SELECT 
      CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'blocked') > 0 THEN 'error'
        WHEN COUNT(*) FILTER (WHERE status IN ('new', 'in_progress') AND due_date < CURRENT_DATE) > 5 THEN 'pressure'
        ELSE 'stable'
      END INTO v_operations_status
    FROM farm_tasks
    WHERE created_at > NOW() - INTERVAL '7 days';
  ELSE
    v_operations_status := 'inactive';
  END IF;

  -- عدد التقارير بانتظار المراجعة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'management_reports') THEN
    SELECT COUNT(*) INTO v_documentation_count
    FROM management_reports
    WHERE status = 'sent_to_admin';
  END IF;

  -- عدد طلبات الخدمة المفتوحة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'investor_action_requests') THEN
    SELECT COUNT(*) INTO v_service_count
    FROM investor_action_requests
    WHERE status = 'open';
  END IF;

  -- عدد المزارع النشطة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'b2f_farms') THEN
    SELECT COUNT(*) INTO v_active_farms
    FROM b2f_farms
    WHERE is_active = true;
  END IF;

  -- عدد المزادات النشطة (تصحيح اسم العمود)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auctions') THEN
    SELECT COUNT(*) INTO v_active_auctions
    FROM auctions
    WHERE status = 'active'
      AND ends_at > NOW();
  END IF;

  RETURN jsonb_build_object(
    'operations_status', v_operations_status,
    'operations_label', CASE v_operations_status
      WHEN 'stable' THEN 'مستقر ✓'
      WHEN 'pressure' THEN 'ضغط عالي ⚠'
      WHEN 'error' THEN 'خلل ✗'
      ELSE 'غير مفعل'
    END,
    'documentation', jsonb_build_object(
      'count', v_documentation_count,
      'label', v_documentation_count || ' تقرير بانتظار المراجعة'
    ),
    'service', jsonb_build_object(
      'count', v_service_count,
      'label', v_service_count || ' طلب خدمة مفتوح'
    ),
    'active_entities', jsonb_build_object(
      'farms', v_active_farms,
      'auctions', v_active_auctions
    )
  );
END;
$$;
