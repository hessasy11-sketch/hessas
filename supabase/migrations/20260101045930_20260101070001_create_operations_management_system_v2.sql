/*
  # نظام إدارة التشغيل - استثمار أشجار المزارع V2

  1. الجداول الجديدة:
    - `b2f_operations_orders` - أوامر التشغيل المرتبطة بالعقود
    - `b2f_operation_logs` - سجل عمليات التشغيل
    - `b2f_operation_reviews` - تقييمات المستثمرين

  2. الميزات:
    - إنشاء سجل تشغيل تلقائي عند إصدار العقد
    - تتبع حالة التشغيل (ready_to_start → in_progress → completed)
    - نظام تقييم الخدمة من المستثمر
*/

-- 1. جدول أوامر التشغيل
CREATE TABLE b2f_operations_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id) ON DELETE CASCADE,
  investor_id UUID,
  farm_id UUID NOT NULL REFERENCES b2f_farms(id),
  opportunity_id UUID REFERENCES b2f_opportunities(id),
  sales_request_id UUID REFERENCES b2f_sales_requests(id),
  
  contract_number TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  investor_phone TEXT NOT NULL,
  tree_type TEXT NOT NULL DEFAULT 'غير محدد',
  trees_count INTEGER NOT NULL CHECK (trees_count > 0),
  farm_name TEXT,
  
  status TEXT NOT NULL DEFAULT 'ready_to_start' CHECK (status IN ('ready_to_start', 'in_progress', 'completed', 'cancelled')),
  
  started_at TIMESTAMPTZ,
  started_by TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  
  season_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  season_name TEXT,
  
  admin_notes TEXT,
  investor_visible_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول سجل العمليات
CREATE TABLE b2f_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES b2f_operations_orders(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'started', 'completed', 'cancelled', 'note_added', 'status_changed')),
  action_description TEXT NOT NULL,
  
  previous_status TEXT,
  new_status TEXT,
  
  performed_by TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  metadata JSONB DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول تقييمات التشغيل
CREATE TABLE b2f_operation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES b2f_operations_orders(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES b2f_contracts(id),
  investor_id UUID,
  investor_phone TEXT NOT NULL,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  review_reason TEXT CHECK (review_reason IN (
    'excellent_service',
    'good_communication',
    'timely_completion',
    'quality_maintenance',
    'professional_team',
    'needs_improvement',
    'delayed_service',
    'poor_communication',
    'other'
  )),
  review_reason_text TEXT,
  
  comment TEXT,
  
  is_visible BOOLEAN DEFAULT true,
  admin_response TEXT,
  admin_response_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(operation_id, investor_phone)
);

-- 4. الفهارس
CREATE INDEX idx_ops_orders_status ON b2f_operations_orders(status);
CREATE INDEX idx_ops_orders_contract ON b2f_operations_orders(contract_id);
CREATE INDEX idx_ops_orders_farm ON b2f_operations_orders(farm_id);
CREATE INDEX idx_ops_orders_phone ON b2f_operations_orders(investor_phone);
CREATE INDEX idx_ops_logs_operation ON b2f_operation_logs(operation_id);
CREATE INDEX idx_ops_reviews_operation ON b2f_operation_reviews(operation_id);
CREATE INDEX idx_ops_reviews_rating ON b2f_operation_reviews(rating);

-- 5. RLS
ALTER TABLE b2f_operations_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_operation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_orders_select" ON b2f_operations_orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ops_orders_insert" ON b2f_operations_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "ops_orders_update" ON b2f_operations_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ops_orders_delete" ON b2f_operations_orders FOR DELETE TO authenticated USING (true);

CREATE POLICY "ops_logs_select" ON b2f_operation_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ops_logs_insert" ON b2f_operation_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "ops_reviews_select" ON b2f_operation_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ops_reviews_insert" ON b2f_operation_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "ops_reviews_update" ON b2f_operation_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 6. دالة إنشاء سجل تشغيل تلقائي
CREATE OR REPLACE FUNCTION create_operation_order_on_contract()
RETURNS TRIGGER AS $$
DECLARE
  v_farm_name TEXT;
  v_tree_type TEXT;
  v_investor_name TEXT;
  v_new_operation_id UUID;
BEGIN
  SELECT name INTO v_farm_name FROM b2f_farms WHERE id = NEW.farm_id;
  
  SELECT tree_type, investor_name INTO v_tree_type, v_investor_name
  FROM b2f_sales_requests WHERE id = NEW.sales_request_id;
  
  INSERT INTO b2f_operations_orders (
    contract_id, investor_id, farm_id, opportunity_id, sales_request_id,
    contract_number, investor_name, investor_phone,
    tree_type, trees_count, farm_name,
    status, season_year, season_name
  ) VALUES (
    NEW.id, NEW.investor_id, NEW.farm_id, NEW.opportunity_id, NEW.sales_request_id,
    NEW.contract_number, COALESCE(v_investor_name, 'مستثمر'), NEW.investor_phone,
    COALESCE(v_tree_type, 'غير محدد'), NEW.trees_count, v_farm_name,
    'ready_to_start', EXTRACT(YEAR FROM NOW())::INTEGER, 'موسم ' || EXTRACT(YEAR FROM NOW())::TEXT
  )
  RETURNING id INTO v_new_operation_id;
  
  INSERT INTO b2f_operation_logs (
    operation_id, action_type, action_description, new_status, performed_by, metadata
  ) VALUES (
    v_new_operation_id, 'created', 'تم إنشاء سجل التشغيل تلقائياً بعد إصدار العقد',
    'ready_to_start', 'النظام',
    jsonb_build_object('contract_number', NEW.contract_number, 'created_from', 'contract_trigger')
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_operation_on_contract ON b2f_contracts;
CREATE TRIGGER trigger_create_operation_on_contract
  AFTER INSERT ON b2f_contracts
  FOR EACH ROW
  EXECUTE FUNCTION create_operation_order_on_contract();

-- 7. دالة بدء التشغيل
CREATE OR REPLACE FUNCTION start_operation(p_operation_id UUID, p_started_by TEXT DEFAULT 'الإدارة')
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE b2f_operations_orders
  SET status = 'in_progress', started_at = NOW(), started_by = p_started_by, updated_at = NOW()
  WHERE id = p_operation_id AND status = 'ready_to_start';
  
  IF FOUND THEN
    INSERT INTO b2f_operation_logs (operation_id, action_type, action_description, previous_status, new_status, performed_by)
    VALUES (p_operation_id, 'started', 'تم بدء التشغيل', 'ready_to_start', 'in_progress', p_started_by);
    v_result := '{"success": true, "message": "تم بدء التشغيل بنجاح"}'::JSONB;
  ELSE
    v_result := '{"success": false, "message": "لا يمكن بدء التشغيل"}'::JSONB;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 8. دالة إكمال التشغيل
CREATE OR REPLACE FUNCTION complete_operation(p_operation_id UUID, p_completed_by TEXT DEFAULT 'الإدارة', p_notes TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE b2f_operations_orders
  SET status = 'completed', completed_at = NOW(), completed_by = p_completed_by,
      investor_visible_notes = COALESCE(p_notes, investor_visible_notes), updated_at = NOW()
  WHERE id = p_operation_id AND status = 'in_progress';
  
  IF FOUND THEN
    INSERT INTO b2f_operation_logs (operation_id, action_type, action_description, previous_status, new_status, performed_by, metadata)
    VALUES (p_operation_id, 'completed', 'تم إكمال التشغيل والموسم', 'in_progress', 'completed', p_completed_by, jsonb_build_object('notes', p_notes));
    v_result := '{"success": true, "message": "تم إكمال التشغيل بنجاح"}'::JSONB;
  ELSE
    v_result := '{"success": false, "message": "لا يمكن إكمال التشغيل"}'::JSONB;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 9. دالة إحصائيات التشغيل
CREATE OR REPLACE FUNCTION get_operations_statistics()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'ready_to_start', COALESCE(SUM(CASE WHEN status = 'ready_to_start' THEN 1 ELSE 0 END), 0),
      'in_progress', COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0),
      'completed', COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
      'total', COUNT(*),
      'total_trees_ready', COALESCE(SUM(CASE WHEN status = 'ready_to_start' THEN trees_count ELSE 0 END), 0),
      'total_trees_in_progress', COALESCE(SUM(CASE WHEN status = 'in_progress' THEN trees_count ELSE 0 END), 0),
      'total_trees_completed', COALESCE(SUM(CASE WHEN status = 'completed' THEN trees_count ELSE 0 END), 0),
      'average_rating', COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM b2f_operation_reviews), 0)
    )
    FROM b2f_operations_orders
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE b2f_operations_orders IS 'أوامر التشغيل - يتم إنشاؤها تلقائياً عند إصدار العقد';
COMMENT ON TABLE b2f_operation_logs IS 'سجل عمليات التشغيل';
COMMENT ON TABLE b2f_operation_reviews IS 'تقييمات المستثمرين';
