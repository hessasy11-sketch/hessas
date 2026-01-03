/*
  # توحيد مسار العمل التسلسلي - الإصدار الصحيح
  
  المسار: collection_queue → payment_open → receipt_uploaded → approved_for_contract → contract_issued → operational
*/

-- 1. إضافة حقل workflow_stage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests' AND column_name = 'workflow_stage'
  ) THEN
    ALTER TABLE b2f_sales_requests ADD COLUMN workflow_stage TEXT DEFAULT 'booking';
  END IF;
END $$;

-- 2. دالة التحقق من صلاحية الانتقال
CREATE FUNCTION validate_workflow_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed_transitions JSONB := '{
    "collection_queue": ["payment_open", "cancelled"],
    "payment_open": ["receipt_uploaded", "collection_queue", "cancelled"],
    "receipt_uploaded": ["receipt_under_review", "auto_approved", "auto_rejected", "cancelled"],
    "receipt_under_review": ["approved_for_contract", "receipt_needs_revision", "rejected_by_staff", "cancelled"],
    "auto_approved": ["approved_for_contract", "receipt_needs_revision", "cancelled"],
    "auto_rejected": ["receipt_needs_revision", "cancelled"],
    "receipt_needs_revision": ["receipt_uploaded", "cancelled"],
    "approved_for_contract": ["contract_issued", "cancelled"],
    "contract_issued": ["operational", "cancelled"],
    "operational": ["completed", "cancelled"],
    "pending": ["collection_queue", "cancelled"]
  }'::jsonb;
BEGIN
  IF OLD.status IS NULL OR OLD.status = '' OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NOT ((allowed_transitions -> OLD.status) ? NEW.status) THEN
    RAISE WARNING 'Transition % to % for request %', OLD.status, NEW.status, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_workflow_transition
  BEFORE UPDATE OF status ON b2f_sales_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_workflow_transition();

-- 3. دالة فتح السداد للطلبات
CREATE FUNCTION open_payment_for_requests(p_request_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE b2f_sales_requests
  SET status = 'payment_open', payment_opened_at = NOW(), workflow_stage = 'payment', updated_at = NOW()
  WHERE id = ANY(p_request_ids) AND status = 'collection_queue';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object('success', true, 'updated_count', updated_count);
END;
$$;

-- 4. دالة فتح السداد لمزرعة
CREATE FUNCTION open_payment_for_farm(p_farm_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE b2f_sales_requests
  SET status = 'payment_open', payment_opened_at = NOW(), workflow_stage = 'payment', updated_at = NOW()
  WHERE farm_id = p_farm_id AND status = 'collection_queue';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object('success', updated_count > 0, 'updated_count', updated_count);
END;
$$;

-- 5. دالة التحقق قبل رفع الإيصال
CREATE FUNCTION validate_receipt_upload()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_receipt_url IS NOT NULL AND OLD.payment_receipt_url IS NULL THEN
    IF OLD.status NOT IN ('payment_open', 'receipt_needs_revision') THEN
      RAISE EXCEPTION 'السداد غير مفتوح';
    END IF;
    NEW.status := 'receipt_uploaded';
    NEW.workflow_stage := 'finance_review';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_receipt_upload_trigger
  BEFORE UPDATE OF payment_receipt_url ON b2f_sales_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_receipt_upload();

-- 6. دالة الاعتماد المالي
CREATE FUNCTION manually_approve_receipt(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
  new_contract_id UUID;
BEGIN
  SELECT * INTO request_record FROM b2f_sales_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'الطلب غير موجود');
  END IF;
  
  IF request_record.status NOT IN ('receipt_uploaded', 'receipt_under_review', 'auto_approved') THEN
    RETURN jsonb_build_object('success', false, 'message', 'الحالة غير صالحة');
  END IF;
  
  UPDATE b2f_sales_requests
  SET status = 'approved_for_contract', finance_status = 'approved_for_contract', payment_status = 'payment_approved',
      finance_reviewed = TRUE, finance_reviewed_at = NOW(), workflow_stage = 'contract_pending', updated_at = NOW()
  WHERE id = p_request_id;
  
  SELECT auto_issue_contract_on_approval(p_request_id) INTO new_contract_id;
  
  RETURN jsonb_build_object('success', true, 'contract_id', new_contract_id);
END;
$$;

-- 7. دالة إصدار العقد
CREATE FUNCTION auto_issue_contract_on_approval(p_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
  new_id UUID;
  new_number TEXT;
BEGIN
  SELECT r.*, f.name as farm_name, o.tree_type as opp_tree_type, o.duration_years as opp_duration
  INTO req
  FROM b2f_sales_requests r
  LEFT JOIN b2f_farms f ON r.farm_id = f.id
  LEFT JOIN b2f_opportunities o ON r.opportunity_id = o.id
  WHERE r.id = p_request_id;
  
  IF req.contract_issued = TRUE THEN RETURN req.contract_id; END IF;
  
  SELECT generate_contract_number() INTO new_number;
  
  INSERT INTO b2f_contracts (
    id, contract_number, sales_request_id, investor_phone, investor_name,
    farm_id, farm_name, opportunity_id, trees_count, tree_type, amount_total,
    contract_type, start_date, end_date, status, operation_status, auto_issued, created_at
  ) VALUES (
    gen_random_uuid(), new_number, p_request_id, req.investor_phone, req.investor_name,
    req.farm_id, req.farm_name, req.opportunity_id, req.number_of_trees,
    COALESCE(req.opp_tree_type, req.tree_type, 'غير محدد'), req.total_amount,
    'investment', NOW(), NOW() + (COALESCE(req.opp_duration, 1) || ' years')::INTERVAL,
    'active', 'pending_start', TRUE, NOW()
  ) RETURNING id INTO new_id;
  
  UPDATE b2f_sales_requests
  SET status = 'contract_issued', contract_id = new_id, contract_issued = TRUE,
      contract_issued_at = NOW(), ready_for_operations = TRUE, workflow_stage = 'operations', updated_at = NOW()
  WHERE id = p_request_id;
  
  IF NOT EXISTS(SELECT 1 FROM b2f_operations_orders WHERE contract_id = new_id) THEN
    INSERT INTO b2f_operations_orders (
      contract_id, farm_id, investor_phone, contract_number, investor_name,
      tree_type, trees_count, farm_name, status, season_year, season_name
    ) VALUES (
      new_id, req.farm_id, req.investor_phone, new_number, req.investor_name,
      COALESCE(req.opp_tree_type, req.tree_type, 'غير محدد'), req.number_of_trees,
      req.farm_name, 'ready_to_start', EXTRACT(YEAR FROM NOW()), 'موسم ' || EXTRACT(YEAR FROM NOW())
    );
  END IF;
  
  INSERT INTO b2f_notifications (investor_phone, title, message, notification_type, is_read) 
  VALUES (req.investor_phone, 'تم إصدار عقدك', 'رقم العقد: ' || new_number, 'contract_issued', FALSE);
  
  RETURN new_id;
END;
$$;

-- 8. تعطيل trigger المكرر
DROP TRIGGER IF EXISTS trigger_create_operation_on_contract ON b2f_contracts;

-- 9. دالة حالة المسار
CREATE FUNCTION get_investor_workflow_status(p_phone TEXT)
RETURNS TABLE (
  request_id UUID, status TEXT, workflow_stage TEXT,
  can_upload_receipt BOOLEAN, can_view_contract BOOLEAN, can_view_operations BOOLEAN, stage_description TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.status, r.workflow_stage,
    r.status IN ('payment_open', 'receipt_needs_revision'),
    r.contract_issued = TRUE,
    r.status IN ('contract_issued', 'operational', 'completed'),
    CASE r.status
      WHEN 'collection_queue' THEN 'في قائمة التجميع'
      WHEN 'payment_open' THEN 'ارفع الإيصال'
      WHEN 'receipt_uploaded' THEN 'قيد المراجعة'
      WHEN 'contract_issued' THEN 'تم إصدار العقد'
      ELSE 'انتظر'
    END
  FROM b2f_sales_requests r WHERE r.investor_phone = p_phone ORDER BY r.created_at DESC;
END;
$$;

-- 10. Views
DROP VIEW IF EXISTS v_collection_queue_requests CASCADE;
CREATE VIEW v_collection_queue_requests AS
SELECT r.id, r.investor_name, r.investor_phone, r.number_of_trees, r.total_amount, 
       r.status, r.farm_id, r.opportunity_id, r.created_at, f.name as farm_name
FROM b2f_sales_requests r LEFT JOIN b2f_farms f ON r.farm_id = f.id
WHERE r.status = 'collection_queue';

DROP VIEW IF EXISTS v_payment_open_requests CASCADE;
CREATE VIEW v_payment_open_requests AS
SELECT r.id, r.investor_name, r.investor_phone, r.number_of_trees, r.total_amount, 
       r.status, r.farm_id, r.created_at, r.payment_opened_at, f.name as farm_name
FROM b2f_sales_requests r LEFT JOIN b2f_farms f ON r.farm_id = f.id
WHERE r.status = 'payment_open';

DROP VIEW IF EXISTS v_pending_finance_review CASCADE;
CREATE VIEW v_pending_finance_review AS
SELECT r.id, r.investor_name, r.investor_phone, r.number_of_trees, r.total_amount, 
       r.status, r.farm_id, r.created_at, r.payment_receipt_url, f.name as farm_name
FROM b2f_sales_requests r LEFT JOIN b2f_farms f ON r.farm_id = f.id
WHERE r.status IN ('receipt_uploaded', 'receipt_under_review', 'auto_approved');

-- 11. Permissions
GRANT SELECT ON v_collection_queue_requests TO anon, authenticated;
GRANT SELECT ON v_payment_open_requests TO anon, authenticated;
GRANT SELECT ON v_pending_finance_review TO anon, authenticated;
GRANT EXECUTE ON FUNCTION open_payment_for_requests(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION open_payment_for_farm(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION manually_approve_receipt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_investor_workflow_status(TEXT) TO anon, authenticated;
