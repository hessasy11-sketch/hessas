/*
  # نظام لوحة القرار الإشرافية
  
  1. الفلسفة
    - لوحة القيادة = عقل المنصة
    - تشير ولا تفصل ولا تنفذ
    - كل مؤشر يجيب: هل أحتاج أتدخل؟
  
  2. المكونات
    - دالة حساب حالة البوابات (B2F + B2B)
    - 4 مؤشرات قيادية رئيسية
    - شريط النبض العام
  
  3. Security
    - متاحة فقط للإدارة العليا
*/

-- =====================================================
-- 1️⃣ دالة: حساب الحالة الذكية لبوابة B2F
-- =====================================================

CREATE OR REPLACE FUNCTION get_b2f_gateway_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_overdue_tasks integer := 0;
  v_unreviewed_reports integer := 0;
  v_pending_requests integer := 0;
  v_status text;
  v_message text;
  v_priority text;
BEGIN
  -- التحقق من الصلاحية
  IF NOT is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  -- حساب المهام المتأخرة (SLA)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'farm_tasks') THEN
    SELECT COUNT(*) INTO v_overdue_tasks
    FROM farm_tasks
    WHERE due_date < CURRENT_DATE
      AND status IN ('new', 'in_progress');
  END IF;

  -- حساب التقارير غير المراجعة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'management_reports') THEN
    SELECT COUNT(*) INTO v_unreviewed_reports
    FROM management_reports
    WHERE status = 'sent_to_admin';
  END IF;

  -- حساب طلبات الخدمة المعلقة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'investor_action_requests') THEN
    SELECT COUNT(*) INTO v_pending_requests
    FROM investor_action_requests
    WHERE status = 'open';
  END IF;

  -- تحديد الحالة الذكية
  IF v_overdue_tasks > 5 OR v_unreviewed_reports > 10 OR v_pending_requests > 15 THEN
    v_status := 'critical';
    v_message := 'تدخل مطلوب';
    v_priority := 'high';
  ELSIF v_overdue_tasks > 0 OR v_unreviewed_reports > 0 OR v_pending_requests > 5 THEN
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
      'overdue_tasks', v_overdue_tasks,
      'unreviewed_reports', v_unreviewed_reports,
      'pending_requests', v_pending_requests
    )
  );
END;
$$;

-- =====================================================
-- 2️⃣ دالة: حساب الحالة الذكية لبوابة B2B
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
BEGIN
  -- التحقق من الصلاحية
  IF NOT is_platform_admin() THEN
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
    WHERE end_date < NOW()
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
-- 3️⃣ دالة: المؤشرات القيادية الأربعة
-- =====================================================

CREATE OR REPLACE FUNCTION get_decision_indicators()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_overdue_sla integer := 0;
  v_unreviewed_docs integer := 0;
  v_pending_service integer := 0;
  v_critical_alerts integer := 0;
BEGIN
  -- التحقق من الصلاحية
  IF NOT is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  -- 🔴 مهام متأخرة (SLA)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'farm_tasks') THEN
    SELECT COUNT(*) INTO v_overdue_sla
    FROM farm_tasks
    WHERE due_date < CURRENT_DATE
      AND status IN ('new', 'in_progress');
  END IF;

  -- 🟠 تقارير توثيق غير مراجعة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'management_reports') THEN
    SELECT COUNT(*) INTO v_unreviewed_docs
    FROM management_reports
    WHERE status = 'sent_to_admin';
  END IF;

  -- 🔵 طلبات خدمة المستثمر المعلقة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'investor_action_requests') THEN
    SELECT COUNT(*) INTO v_pending_service
    FROM investor_action_requests
    WHERE status = 'open';
  END IF;

  -- 🟣 تنبيهات نظام حرجة
  SELECT COUNT(*) INTO v_critical_alerts
  FROM platform_alerts
  WHERE is_resolved = false
    AND severity IN ('high', 'critical');

  RETURN jsonb_build_object(
    'overdue_sla', jsonb_build_object(
      'count', v_overdue_sla,
      'severity', CASE 
        WHEN v_overdue_sla > 10 THEN 'critical'
        WHEN v_overdue_sla > 5 THEN 'high'
        WHEN v_overdue_sla > 0 THEN 'medium'
        ELSE 'low'
      END,
      'label', 'مهام متأخرة (SLA)'
    ),
    'unreviewed_docs', jsonb_build_object(
      'count', v_unreviewed_docs,
      'severity', CASE 
        WHEN v_unreviewed_docs > 20 THEN 'critical'
        WHEN v_unreviewed_docs > 10 THEN 'high'
        WHEN v_unreviewed_docs > 0 THEN 'medium'
        ELSE 'low'
      END,
      'label', 'تقارير توثيق غير مراجعة'
    ),
    'pending_service', jsonb_build_object(
      'count', v_pending_service,
      'severity', CASE 
        WHEN v_pending_service > 25 THEN 'critical'
        WHEN v_pending_service > 15 THEN 'high'
        WHEN v_pending_service > 5 THEN 'medium'
        ELSE 'low'
      END,
      'label', 'طلبات خدمة المستثمر'
    ),
    'critical_alerts', jsonb_build_object(
      'count', v_critical_alerts,
      'severity', CASE 
        WHEN v_critical_alerts > 5 THEN 'critical'
        WHEN v_critical_alerts > 2 THEN 'high'
        WHEN v_critical_alerts > 0 THEN 'medium'
        ELSE 'low'
      END,
      'label', 'تنبيهات نظام حرجة'
    )
  );
END;
$$;

-- =====================================================
-- 4️⃣ دالة: شريط النبض العام
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
BEGIN
  -- التحقق من الصلاحية
  IF NOT is_platform_admin() THEN
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

  -- عدد المزادات النشطة
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auctions') THEN
    SELECT COUNT(*) INTO v_active_auctions
    FROM auctions
    WHERE status = 'active'
      AND end_date > NOW();
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

-- =====================================================
-- 5️⃣ دالة مجمعة: لوحة القرار الكاملة
-- =====================================================

CREATE OR REPLACE FUNCTION get_decision_board()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من الصلاحية
  IF NOT is_platform_admin() THEN
    RETURN jsonb_build_object('error', 'غير مصرح');
  END IF;

  RETURN jsonb_build_object(
    'gateways', jsonb_build_object(
      'b2f', get_b2f_gateway_status(),
      'b2b', get_b2b_gateway_status()
    ),
    'indicators', get_decision_indicators(),
    'pulse', get_system_pulse(),
    'timestamp', NOW()
  );
END;
$$;

-- =====================================================
-- تعليق توضيحي
-- =====================================================

COMMENT ON FUNCTION get_decision_board IS 'لوحة القرار الإشرافية - تُشير ولا تُفصّل ولا تُنفّذ';
