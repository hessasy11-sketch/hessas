/*
  # إصلاح شامل لدالة الاعتماد

  تحديث الدالة مع جميع الحقول الصحيحة
*/

CREATE OR REPLACE FUNCTION manually_approve_receipt(request_id uuid)
RETURNS jsonb AS $$
DECLARE
  request_record RECORD;
  contract_id uuid;
  contract_num text;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO request_record
  FROM b2f_sales_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- توليد رقم عقد
  contract_num := 'B2F-' || LPAD((SELECT COUNT(*) + 1 FROM b2f_contracts)::text, 6, '0');
  
  -- تحديث الحالة
  UPDATE b2f_sales_requests
  SET 
    status = 'approved',
    finance_reviewed = true,
    finance_reviewed_at = NOW(),
    contract_issued = true,
    updated_at = NOW()
  WHERE id = request_id;
  
  -- إصدار العقد
  INSERT INTO b2f_contracts (
    contract_number,
    sales_request_id,
    investor_phone,
    farm_id,
    opportunity_id,
    trees_count,
    amount_total,
    contract_type,
    start_date,
    status,
    created_at
  )
  VALUES (
    contract_num,
    request_record.id,
    request_record.investor_phone,
    request_record.farm_id,
    request_record.opportunity_id,
    request_record.tree_quantity,
    request_record.total_amount,
    'tree_investment',
    NOW(),
    'active',
    NOW()
  )
  ON CONFLICT (sales_request_id) DO UPDATE
  SET updated_at = NOW()
  RETURNING id INTO contract_id;
  
  -- إرسال إشعار
  INSERT INTO b2f_notifications (
    type,
    title,
    message,
    investor_phone,
    sales_request_id,
    is_read,
    created_at
  )
  VALUES (
    'contract_issued',
    'تم إصدار عقدك',
    'تم اعتماد دفعتك وإصدار العقد رقم ' || contract_num || '. يمكنك الآن الاطلاع عليه من قسم عقودي.',
    request_record.investor_phone,
    request_id,
    false,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', contract_id,
    'contract_number', contract_num
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث الـ trigger للاعتماد الآلي
CREATE OR REPLACE FUNCTION auto_issue_contract_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  contract_num text;
BEGIN
  -- إذا تم قبول الإيصال آلياً بثقة عالية جداً
  IF NEW.status = 'auto_approved' 
     AND NEW.ai_confidence_score >= 95 
     AND OLD.status != 'auto_approved' THEN
    
    -- تحديث الحالة مباشرة إلى معتمد
    NEW.status := 'approved';
    NEW.finance_reviewed := true;
    NEW.finance_reviewed_at := NOW();
    NEW.contract_issued := true;
    
    -- توليد رقم عقد
    contract_num := 'B2F-AUTO-' || LPAD((SELECT COUNT(*) + 1 FROM b2f_contracts)::text, 6, '0');
    
    -- إصدار العقد تلقائياً
    INSERT INTO b2f_contracts (
      contract_number,
      sales_request_id,
      investor_phone,
      farm_id,
      opportunity_id,
      trees_count,
      amount_total,
      contract_type,
      start_date,
      status,
      created_at
    )
    VALUES (
      contract_num,
      NEW.id,
      NEW.investor_phone,
      NEW.farm_id,
      NEW.opportunity_id,
      NEW.tree_quantity,
      NEW.total_amount,
      'tree_investment',
      NOW(),
      'active',
      NOW()
    )
    ON CONFLICT (sales_request_id) DO NOTHING;
    
    -- إرسال إشعار
    INSERT INTO b2f_notifications (
      type,
      title,
      message,
      investor_phone,
      sales_request_id,
      is_read,
      created_at
    )
    VALUES (
      'contract_issued',
      'تم إصدار عقدك تلقائياً',
      'تم اعتماد دفعتك آلياً وإصدار العقد رقم ' || contract_num || '. يمكنك الآن الاطلاع عليه من قسم عقودي.',
      NEW.investor_phone,
      NEW.id,
      false,
      NOW()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء الـ trigger
DROP TRIGGER IF EXISTS auto_issue_contract_trigger ON b2f_sales_requests;
CREATE TRIGGER auto_issue_contract_trigger
BEFORE UPDATE ON b2f_sales_requests
FOR EACH ROW
EXECUTE FUNCTION auto_issue_contract_on_approval();
