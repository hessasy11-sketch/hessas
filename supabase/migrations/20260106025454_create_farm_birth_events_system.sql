/*
  # نظام أحداث ولادة المزرعة - المرحلة 1
  
  ## الهدف
  تسجيل "حدث ولادة المزرعة" عند توثيق العقد وتفعيله
  
  ## نقطة الولادة (Trigger Point)
  عندما يصبح contract.status = 'active'
  
  ## المكونات
  1. جدول farm_birth_events
     - معلومات الحدث
     - ربط بالعقد والمزرعة والمستثمر
  
  2. Function لإنشاء حدث الولادة
     - تُستدعى تلقائياً عند تفعيل عقد
  
  3. Trigger على b2f_contracts
     - يراقب التحديثات
     - عند status = 'active' → ينشئ حدث ولادة
  
  ## الاختبار
  عقد واحد يتم تفعيله → يظهر event "FARM_BORN"
*/

-- =====================================================
-- 1. جدول أحداث ولادة المزرعة
-- =====================================================
CREATE TABLE IF NOT EXISTS farm_birth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'FARM_BORN',
  
  -- الربط الأساسي
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  investor_phone text NOT NULL,
  
  -- معلومات العقد
  contract_number text NOT NULL,
  trees_count integer NOT NULL DEFAULT 0,
  contract_start_date timestamptz,
  contract_end_date timestamptz,
  
  -- معلومات المزرعة
  farm_name text,
  farm_location text,
  
  -- معلومات المستثمر
  investor_name text,
  
  -- البيانات الإضافية (JSON)
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- الطوابع الزمنية
  created_at timestamptz DEFAULT now(),
  
  -- فهرس فريد: عقد واحد = حدث ولادة واحد
  UNIQUE(contract_id)
);

-- =====================================================
-- 2. الفهارس للأداء
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_farm_birth_events_farm_id 
  ON farm_birth_events(farm_id);

CREATE INDEX IF NOT EXISTS idx_farm_birth_events_contract_id 
  ON farm_birth_events(contract_id);

CREATE INDEX IF NOT EXISTS idx_farm_birth_events_investor_phone 
  ON farm_birth_events(investor_phone);

CREATE INDEX IF NOT EXISTS idx_farm_birth_events_created_at 
  ON farm_birth_events(created_at DESC);

-- =====================================================
-- 3. RLS Policies
-- =====================================================
ALTER TABLE farm_birth_events ENABLE ROW LEVEL SECURITY;

-- Policy: الجميع يمكنهم القراءة
CREATE POLICY "Anyone can view farm birth events"
  ON farm_birth_events
  FOR SELECT
  USING (true);

-- Policy: فقط النظام يمكنه الإدخال (عبر trigger)
CREATE POLICY "System can insert farm birth events"
  ON farm_birth_events
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 4. Function: إنشاء حدث ولادة المزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION create_farm_birth_event(
  p_contract_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract b2f_contracts%ROWTYPE;
  v_farm b2f_farms%ROWTYPE;
  v_event_id uuid;
BEGIN
  -- جلب بيانات العقد
  SELECT * INTO v_contract
  FROM b2f_contracts
  WHERE id = p_contract_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id;
  END IF;
  
  -- التحقق من أن العقد نشط
  IF v_contract.status != 'active' THEN
    RAISE EXCEPTION 'Contract is not active. Status: %', v_contract.status;
  END IF;
  
  -- جلب بيانات المزرعة
  IF v_contract.farm_id IS NOT NULL THEN
    SELECT * INTO v_farm
    FROM b2f_farms
    WHERE id = v_contract.farm_id;
  END IF;
  
  -- إنشاء حدث الولادة (مع تجنب التكرار)
  INSERT INTO farm_birth_events (
    event_type,
    farm_id,
    contract_id,
    investor_phone,
    contract_number,
    trees_count,
    contract_start_date,
    contract_end_date,
    farm_name,
    farm_location,
    investor_name,
    metadata
  )
  VALUES (
    'FARM_BORN',
    v_contract.farm_id,
    p_contract_id,
    v_contract.investor_phone,
    v_contract.contract_number,
    v_contract.trees_count,
    v_contract.start_date,
    v_contract.end_date,
    COALESCE(v_farm.name, 'غير محدد'),
    COALESCE(v_farm.location, 'غير محدد'),
    v_contract.investor_phone, -- سنحصل على الاسم من النظام لاحقاً
    jsonb_build_object(
      'contract_type', v_contract.contract_type,
      'opportunity_id', v_contract.opportunity_id,
      'amount_total', v_contract.amount_total
    )
  )
  ON CONFLICT (contract_id) DO NOTHING
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- =====================================================
-- 5. Trigger: مراقبة تفعيل العقود
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_farm_birth_on_contract_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- عند إنشاء عقد جديد بحالة 'active'
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN
    PERFORM create_farm_birth_event(NEW.id);
  END IF;
  
  -- عند تحديث عقد من حالة أخرى إلى 'active'
  IF (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
    PERFORM create_farm_birth_event(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- ربط الـ Trigger بجدول العقود
DROP TRIGGER IF EXISTS trigger_farm_birth_event ON b2f_contracts;

CREATE TRIGGER trigger_farm_birth_event
  AFTER INSERT OR UPDATE OF status ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_farm_birth_on_contract_activation();

-- =====================================================
-- 6. دالة مساعدة: جلب أحداث الولادة لمزرعة
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_birth_events(
  p_farm_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  event_type text,
  contract_id uuid,
  contract_number text,
  investor_phone text,
  investor_name text,
  trees_count integer,
  farm_name text,
  farm_location text,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fbe.id,
    fbe.event_type,
    fbe.contract_id,
    fbe.contract_number,
    fbe.investor_phone,
    fbe.investor_name,
    fbe.trees_count,
    fbe.farm_name,
    fbe.farm_location,
    fbe.created_at,
    fbe.metadata
  FROM farm_birth_events fbe
  WHERE fbe.farm_id = p_farm_id
  ORDER BY fbe.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 7. دالة مساعدة: إحصائيات الولادة
-- =====================================================
CREATE OR REPLACE FUNCTION get_farm_birth_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total_births', COUNT(*),
    'births_today', COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE),
    'births_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'births_this_month', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    'total_trees', COALESCE(SUM(trees_count), 0),
    'farms_activated', COUNT(DISTINCT farm_id),
    'unique_investors', COUNT(DISTINCT investor_phone)
  )
  INTO v_stats
  FROM farm_birth_events;
  
  RETURN v_stats;
END;
$$;

-- =====================================================
-- 8. Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION create_farm_birth_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_farm_birth_event(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_farm_birth_events(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_birth_events(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_farm_birth_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_birth_stats() TO anon;

-- =====================================================
-- تعليقات توضيحية
-- =====================================================
COMMENT ON TABLE farm_birth_events IS 'سجل أحداث ولادة المزرعة عند توثيق وتفعيل العقود';
COMMENT ON FUNCTION create_farm_birth_event IS 'إنشاء حدث ولادة مزرعة عند تفعيل عقد';
COMMENT ON FUNCTION trigger_farm_birth_on_contract_activation IS 'Trigger تلقائي لإنشاء حدث الولادة عند تفعيل عقد';
COMMENT ON FUNCTION get_farm_birth_events IS 'جلب أحداث الولادة لمزرعة معينة';
COMMENT ON FUNCTION get_farm_birth_stats IS 'إحصائيات شاملة لأحداث الولادة';
