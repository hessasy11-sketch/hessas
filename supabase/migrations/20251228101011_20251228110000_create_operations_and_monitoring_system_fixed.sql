/*
  # نظام التشغيل والمتابعة - B2F Operations & Monitoring System (Fixed)

  ## نظرة عامة
  هذا النظام يدير عملية تحويل الطلبات المعتمدة إلى بطاقات تشغيل فعلية
  مع متابعة التشغيل والصيانة بشكل تلقائي بمساعدة الذكاء الصناعي.

  ## الجداول الجديدة
  
  ### 1. b2f_operation_cards
  بطاقات التشغيل الرئيسية لكل طلب تم تحويله للتشغيل
  
  ### 2. b2f_operation_timeline
  سجل زمني لجميع الأحداث التشغيلية
  
  ### 3. b2f_operation_maintenance
  سجل أعمال الصيانة والمتابعة
  
  ## الأمان
  - تفعيل RLS على جميع الجداول
  - سياسات القراءة والكتابة للمسؤولين فقط (authenticated)
*/

-- ===================================
-- 1. جدول بطاقات التشغيل الرئيسي
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_operation_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- الربط مع الطلب والمزرعة
  request_id uuid NOT NULL REFERENCES b2f_investment_requests(id) ON DELETE RESTRICT,
  farm_id uuid NOT NULL REFERENCES b2f_farms(id) ON DELETE RESTRICT,
  opportunity_id uuid NOT NULL REFERENCES b2f_opportunities(id) ON DELETE RESTRICT,
  
  -- بيانات المستثمر
  investor_name text NOT NULL,
  investor_phone text NOT NULL,
  investor_email text,
  
  -- بيانات العقد والأشجار
  trees_count integer NOT NULL CHECK (trees_count > 0),
  tree_type text NOT NULL,
  contract_number text NOT NULL,
  contract_duration_months integer NOT NULL,
  contract_start_date date NOT NULL DEFAULT CURRENT_DATE,
  contract_end_date date NOT NULL,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  
  -- حالة السداد
  payment_status text NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('paid', 'partial', 'pending')
  ),
  payment_amount numeric(12,2) DEFAULT 0 CHECK (payment_amount >= 0),
  payment_receipt_url text,
  
  -- حالة التشغيل
  operation_status text NOT NULL DEFAULT 'scheduled' CHECK (
    operation_status IN ('scheduled', 'active', 'paused', 'completed', 'cancelled')
  ),
  
  -- جدولة التشغيل
  scheduled_start_date date,
  actual_start_date date,
  completion_date date,
  
  -- الذكاء الصناعي
  ai_suggestions jsonb DEFAULT '{
    "recommended_start_date": null,
    "optimal_season": null,
    "expected_yield": null,
    "maintenance_schedule": [],
    "risk_factors": []
  }'::jsonb,
  
  -- السجلات والملاحظات
  manual_actions_log jsonb DEFAULT '[]'::jsonb,
  maintenance_log jsonb DEFAULT '[]'::jsonb,
  notes text,
  admin_notes text,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  transferred_at timestamptz DEFAULT now(),
  
  -- Constraint للتأكد من طلب واحد فقط
  CONSTRAINT unique_request_operation UNIQUE(request_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operation_cards_farm ON b2f_operation_cards(farm_id);
CREATE INDEX IF NOT EXISTS idx_operation_cards_opportunity ON b2f_operation_cards(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_operation_cards_status ON b2f_operation_cards(operation_status);
CREATE INDEX IF NOT EXISTS idx_operation_cards_payment ON b2f_operation_cards(payment_status);
CREATE INDEX IF NOT EXISTS idx_operation_cards_investor_phone ON b2f_operation_cards(investor_phone);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_b2f_operation_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_operation_cards_updated_at ON b2f_operation_cards;
CREATE TRIGGER trigger_update_operation_cards_updated_at
  BEFORE UPDATE ON b2f_operation_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_operation_cards_updated_at();

-- ===================================
-- 2. جدول السجل الزمني للعمليات
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_operation_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_card_id uuid NOT NULL REFERENCES b2f_operation_cards(id) ON DELETE CASCADE,
  
  event_type text NOT NULL CHECK (
    event_type IN (
      'created', 'started', 'paused', 'resumed', 
      'completed', 'cancelled', 'payment_updated',
      'maintenance_scheduled', 'maintenance_completed',
      'manual_action', 'ai_suggestion', 'status_changed'
    )
  ),
  
  event_title text NOT NULL,
  event_description text,
  event_data jsonb DEFAULT '{}'::jsonb,
  
  performed_by text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operation_timeline_card ON b2f_operation_timeline(operation_card_id);
CREATE INDEX IF NOT EXISTS idx_operation_timeline_type ON b2f_operation_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_operation_timeline_date ON b2f_operation_timeline(created_at DESC);

-- ===================================
-- 3. جدول سجل الصيانة والمتابعة
-- ===================================

CREATE TABLE IF NOT EXISTS b2f_operation_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_card_id uuid NOT NULL REFERENCES b2f_operation_cards(id) ON DELETE CASCADE,
  
  maintenance_type text NOT NULL CHECK (
    maintenance_type IN (
      'irrigation', 'fertilization', 'pruning', 
      'pest_control', 'harvest', 'inspection', 'other'
    )
  ),
  
  title text NOT NULL,
  description text,
  
  scheduled_date date NOT NULL,
  completed_date date,
  
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  
  cost numeric(10,2) DEFAULT 0 CHECK (cost >= 0),
  notes text,
  
  performed_by text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operation_maintenance_card ON b2f_operation_maintenance(operation_card_id);
CREATE INDEX IF NOT EXISTS idx_operation_maintenance_type ON b2f_operation_maintenance(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_operation_maintenance_status ON b2f_operation_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_operation_maintenance_date ON b2f_operation_maintenance(scheduled_date);

-- ===================================
-- 4. RLS Policies
-- ===================================

ALTER TABLE b2f_operation_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_operation_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_operation_maintenance ENABLE ROW LEVEL SECURITY;

-- السماح للمسؤولين بالقراءة والكتابة
CREATE POLICY "Admins can read operation cards"
  ON b2f_operation_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert operation cards"
  ON b2f_operation_cards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update operation cards"
  ON b2f_operation_cards FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete operation cards"
  ON b2f_operation_cards FOR DELETE
  TO authenticated
  USING (true);

-- Timeline policies
CREATE POLICY "Admins can read timeline"
  ON b2f_operation_timeline FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert timeline"
  ON b2f_operation_timeline FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Maintenance policies
CREATE POLICY "Admins can manage maintenance"
  ON b2f_operation_maintenance FOR ALL
  TO authenticated
  USING (true);

-- ===================================
-- 5. دالة الترحيل التلقائي من الطلبات
-- ===================================

CREATE OR REPLACE FUNCTION auto_transfer_request_to_operations()
RETURNS TRIGGER AS $$
DECLARE
  v_suggested_start_date date;
  v_contract_end_date date;
BEGIN
  -- فقط عند تحويل الحالة إلى TRUE
  IF NEW.transferred_to_operations = true AND 
     (OLD.transferred_to_operations IS NULL OR OLD.transferred_to_operations = false) THEN
    
    -- حساب تاريخ البداية المقترح (بعد 7 أيام)
    v_suggested_start_date := CURRENT_DATE + INTERVAL '7 days';
    
    -- حساب تاريخ نهاية العقد
    v_contract_end_date := CURRENT_DATE + (NEW.contract_duration_months || ' months')::interval;
    
    -- إنشاء بطاقة تشغيل جديدة
    INSERT INTO b2f_operation_cards (
      request_id,
      farm_id,
      opportunity_id,
      investor_name,
      investor_phone,
      investor_email,
      trees_count,
      tree_type,
      contract_number,
      contract_duration_months,
      contract_start_date,
      contract_end_date,
      total_amount,
      payment_status,
      payment_receipt_url,
      operation_status,
      scheduled_start_date,
      ai_suggestions,
      transferred_at
    ) VALUES (
      NEW.id,
      NEW.farm_id,
      NEW.opportunity_id,
      NEW.investor_name,
      NEW.investor_phone,
      NEW.investor_email,
      NEW.number_of_trees,
      NEW.tree_type,
      COALESCE(NEW.contract_number, 'CONTRACT-' || NEW.id::text),
      NEW.contract_duration_months,
      CURRENT_DATE,
      v_contract_end_date,
      NEW.total_amount,
      CASE 
        WHEN NEW.payment_receipt_url IS NOT NULL AND NEW.payment_verified = true THEN 'paid'
        WHEN NEW.payment_receipt_url IS NOT NULL THEN 'partial'
        ELSE 'pending'
      END,
      NEW.payment_receipt_url,
      'scheduled',
      v_suggested_start_date,
      jsonb_build_object(
        'recommended_start_date', v_suggested_start_date,
        'optimal_season', 'spring',
        'auto_generated', true,
        'generation_timestamp', now()
      ),
      now()
    );
    
    -- تسجيل الحدث في Timeline
    INSERT INTO b2f_operation_timeline (
      operation_card_id,
      event_type,
      event_title,
      event_description,
      event_data,
      performed_by
    ) 
    SELECT 
      oc.id,
      'created',
      'تم إنشاء بطاقة تشغيل جديدة',
      'تم ترحيل الطلب تلقائياً إلى قسم التشغيل والمتابعة',
      jsonb_build_object(
        'request_id', NEW.id,
        'trees_count', NEW.number_of_trees,
        'contract_number', COALESCE(NEW.contract_number, 'CONTRACT-' || NEW.id::text)
      ),
      'system'
    FROM b2f_operation_cards oc
    WHERE oc.request_id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger للترحيل التلقائي
DROP TRIGGER IF EXISTS trigger_auto_transfer_to_operations ON b2f_investment_requests;
CREATE TRIGGER trigger_auto_transfer_to_operations
  AFTER INSERT OR UPDATE OF transferred_to_operations ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_transfer_request_to_operations();

-- ===================================
-- 6. دوال مساعدة
-- ===================================

-- دالة لجلب إحصائيات التشغيل حسب المزرعة
CREATE OR REPLACE FUNCTION get_farm_operation_stats(p_farm_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_operations', COUNT(*),
    'active_operations', COUNT(*) FILTER (WHERE operation_status = 'active'),
    'scheduled_operations', COUNT(*) FILTER (WHERE operation_status = 'scheduled'),
    'paused_operations', COUNT(*) FILTER (WHERE operation_status = 'paused'),
    'completed_operations', COUNT(*) FILTER (WHERE operation_status = 'completed'),
    'total_trees', COALESCE(SUM(trees_count), 0),
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'paid_amount', COALESCE(SUM(payment_amount), 0)
  )
  INTO v_stats
  FROM b2f_operation_cards
  WHERE farm_id = p_farm_id;
  
  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- النهاية
-- ===================================

COMMENT ON TABLE b2f_operation_cards IS 'بطاقات التشغيل والمتابعة لكل مزرعة - يتم إنشاؤها تلقائياً عند ترحيل الطلبات';
COMMENT ON TABLE b2f_operation_timeline IS 'السجل الزمني لجميع أحداث التشغيل';
COMMENT ON TABLE b2f_operation_maintenance IS 'سجل أعمال الصيانة والمتابعة';