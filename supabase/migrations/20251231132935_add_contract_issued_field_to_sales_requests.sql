/*
  # إضافة حقل contract_issued لطلبات المبيعات

  1. التغييرات
    - إضافة حقل `contract_issued` لجدول `b2f_sales_requests`
    - تحديث دالة `issue_contract_for_request` لتحديث الحقل
    
  2. الهدف
    - منع إصدار عقد مكرر لنفس الطلب
    - تتبع الطلبات التي تم إصدار عقود لها
*/

-- إضافة حقل contract_issued
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'b2f_sales_requests' AND column_name = 'contract_issued'
  ) THEN
    ALTER TABLE b2f_sales_requests ADD COLUMN contract_issued boolean DEFAULT false;
  END IF;
END $$;

-- تحديث دالة إصدار العقد
CREATE OR REPLACE FUNCTION issue_contract_for_request(request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract_id uuid;
  v_contract_number text;
  v_request b2f_sales_requests%ROWTYPE;
  v_opportunity b2f_opportunities%ROWTYPE;
  v_farm b2f_farms%ROWTYPE;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO v_request
  FROM b2f_sales_requests
  WHERE id = request_id AND payment_status = 'payment_approved' AND contract_issued = false;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found, not approved for payment, or contract already issued';
  END IF;
  
  -- جلب بيانات العرض والمزرعة
  SELECT * INTO v_opportunity FROM b2f_opportunities WHERE id = v_request.opportunity_id;
  SELECT * INTO v_farm FROM b2f_farms WHERE id = v_opportunity.farm_id;
  
  -- توليد رقم العقد
  v_contract_number := generate_contract_number();
  
  -- إنشاء العقد
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    investor_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    amount_total,
    contract_type,
    start_date,
    end_date,
    status
  ) VALUES (
    v_contract_number,
    request_id,
    v_request.investor_account_id,
    v_request.investor_phone,
    v_opportunity.farm_id,
    v_request.opportunity_id,
    v_request.trees_count,
    v_request.amount_total,
    v_opportunity.category,
    now(),
    now() + interval '1 year',
    'active'
  )
  RETURNING id INTO v_contract_id;
  
  -- تحديث الطلب بأنه تم إصدار عقد له
  UPDATE b2f_sales_requests
  SET contract_issued = true
  WHERE id = request_id;
  
  -- إنشاء أمر تشغيل
  INSERT INTO b2f_operations_orders (
    contract_id,
    investor_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    status
  ) VALUES (
    v_contract_id,
    v_request.investor_account_id,
    v_request.investor_phone,
    v_opportunity.farm_id,
    v_request.opportunity_id,
    v_request.trees_count,
    'pending_start'
  );
  
  -- إشعار للمستثمر
  INSERT INTO b2f_notifications (
    investor_phone,
    type,
    title,
    message
  ) VALUES (
    v_request.investor_phone,
    'contract_issued',
    'تم إصدار عقد استثمار جديد',
    'تم إصدار عقد استثمار جديد رقم ' || v_contract_number || '، يمكنك الاطلاع عليه من تبويب (عقودي) في حسابك.'
  );
  
  RETURN v_contract_id;
END;
$$;
