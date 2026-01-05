/*
  # إضافة مؤشرات المحاسب والتسويق لغرفة العمليات
  
  ## المؤشرات المضافة
  
  ### 1. المحاسب (Finance)
  وفقاً للمواصفات: "مشترك بين القسمين"
  - إجمالي مدفوعات اليوم
  - إجمالي مصروفات اليوم
  - عمليات تحتاج مراجعة
  - صافي اليوم/الأسبوع
  
  ### 2. التسويق (Marketing)
  وفقاً للمواصفات: "في مدخل غرفة العمليات + داخل الغرفتين"
  - زيارات المنصة
  - زيارات B2F
  - زيارات B2B
  - Conversion بسيط (حجوزات/زيارات أو مزايدات/زيارات)
  
  ## الدوال الجديدة
  
  ### get_executive_pulse_finance()
  يحسب المؤشرات المالية الحية
  
  ### get_executive_pulse_marketing()
  يحسب مؤشرات التسويق والزيارات
*/

-- ============================================
-- 1. دالة المؤشرات المالية للمحاسب
-- ============================================

CREATE OR REPLACE FUNCTION get_executive_pulse_finance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_payments_today numeric;
  v_expenses_today numeric;
  v_pending_reviews integer;
  v_net_today numeric;
  v_net_week numeric;
BEGIN
  -- إجمالي المدفوعات اليوم (من b2f_payment_documents)
  SELECT COALESCE(SUM(amount), 0) INTO v_payments_today
  FROM b2f_payment_documents
  WHERE DATE(created_at) = CURRENT_DATE
  AND finance_status = 'approved';
  
  -- إجمالي المصروفات اليوم (من operation_fees)
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses_today
  FROM operation_fees
  WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'paid';
  
  -- العمليات التي تحتاج مراجعة
  SELECT COUNT(*) INTO v_pending_reviews
  FROM b2f_payment_documents
  WHERE finance_status = 'pending_review';
  
  -- صافي اليوم
  v_net_today := v_payments_today - v_expenses_today;
  
  -- صافي الأسبوع
  SELECT 
    COALESCE(SUM(CASE WHEN finance_status = 'approved' THEN amount ELSE 0 END), 0) -
    COALESCE((SELECT SUM(amount) FROM operation_fees 
              WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' 
              AND status = 'paid'), 0)
  INTO v_net_week
  FROM b2f_payment_documents
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  v_result := jsonb_build_object(
    'payments_today', v_payments_today,
    'expenses_today', v_expenses_today,
    'pending_reviews', v_pending_reviews,
    'net_today', v_net_today,
    'net_week', v_net_week,
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ============================================
-- 2. دالة مؤشرات التسويق (الزيارات)
-- ============================================

CREATE OR REPLACE FUNCTION get_executive_pulse_marketing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_platform_total integer;
  v_b2f_visits integer;
  v_b2b_visits integer;
  v_b2f_conversion numeric;
  v_b2b_conversion numeric;
  v_total_bookings integer;
  v_total_auctions integer;
BEGIN
  -- عدد الفرص في B2F (كمؤشر للزيارات)
  SELECT COUNT(*) INTO v_b2f_visits
  FROM b2f_opportunities
  WHERE status = 'active';
  
  -- عدد المزادات في B2B (كمؤشر للزيارات)
  SELECT COUNT(*) INTO v_b2b_visits
  FROM auctions
  WHERE status IN ('active', 'pending');
  
  -- إجمالي زيارات المنصة
  v_platform_total := v_b2f_visits + v_b2b_visits;
  
  -- عدد الحجوزات (Sales Requests)
  SELECT COUNT(*) INTO v_total_bookings
  FROM b2f_sales_requests;
  
  -- عدد المزادات الكلية
  SELECT COUNT(*) INTO v_total_auctions
  FROM auctions;
  
  -- Conversion B2F (حجوزات/فرص)
  IF v_b2f_visits > 0 THEN
    v_b2f_conversion := (v_total_bookings::numeric / v_b2f_visits::numeric) * 100;
  ELSE
    v_b2f_conversion := 0;
  END IF;
  
  -- Conversion B2B (مزادات مباعة/مزادات كلية)
  IF v_total_auctions > 0 THEN
    SELECT 
      (COUNT(CASE WHEN status = 'sold' THEN 1 END)::numeric / COUNT(*)::numeric) * 100
    INTO v_b2b_conversion
    FROM auctions;
  ELSE
    v_b2b_conversion := 0;
  END IF;
  
  v_result := jsonb_build_object(
    'platform_total', v_platform_total,
    'b2f_visits', v_b2f_visits,
    'b2b_visits', v_b2b_visits,
    'b2f_conversion', ROUND(v_b2f_conversion, 2),
    'b2b_conversion', ROUND(v_b2b_conversion, 2),
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ============================================
-- 3. تحديث دالة get_platform_visits_breakdown لتكون أكثر دقة
-- ============================================

CREATE OR REPLACE FUNCTION get_platform_visits_breakdown()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_b2f_visits integer;
  v_b2b_visits integer;
  v_farms_breakdown jsonb;
  v_auctions_breakdown jsonb;
BEGIN
  -- زيارات B2F (عدد الفرص النشطة)
  SELECT COUNT(*) INTO v_b2f_visits
  FROM b2f_opportunities
  WHERE status = 'active';
  
  -- زيارات B2B (عدد المزادات النشطة)
  SELECT COUNT(*) INTO v_b2b_visits
  FROM auctions
  WHERE status IN ('active', 'pending');
  
  -- تفصيل الزيارات حسب المزارع (عدد الفرص لكل مزرعة)
  SELECT jsonb_object_agg(
    farm_id::text,
    opportunity_count
  ) INTO v_farms_breakdown
  FROM (
    SELECT farm_id, COUNT(*) as opportunity_count
    FROM b2f_opportunities
    WHERE status = 'active' AND farm_id IS NOT NULL
    GROUP BY farm_id
  ) farms;
  
  -- تفصيل الزيارات حسب المزادات (افتراضي: كل مزاد له زيارة واحدة)
  SELECT jsonb_object_agg(
    id::text,
    1
  ) INTO v_auctions_breakdown
  FROM auctions
  WHERE status IN ('active', 'pending')
  LIMIT 100;
  
  v_result := jsonb_build_object(
    'platform_total', v_b2f_visits + v_b2b_visits,
    'b2f_visits', v_b2f_visits,
    'b2b_visits', v_b2b_visits,
    'farms_breakdown', COALESCE(v_farms_breakdown, '{}'::jsonb),
    'auctions_breakdown', COALESCE(v_auctions_breakdown, '{}'::jsonb),
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- ============================================
-- Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_executive_pulse_finance() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_executive_pulse_marketing() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_platform_visits_breakdown() TO PUBLIC;
