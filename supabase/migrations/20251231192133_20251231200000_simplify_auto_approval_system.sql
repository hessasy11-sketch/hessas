/*
  # تبسيط نظام الاعتماد الآلي

  ## التغييرات
  
  1. إلغاء خطوة المراجعة المالية اليدوية
  2. الإيصالات المقبولة آلياً تذهب مباشرة لإصدار العقود
  3. تبسيط الحالات والمسار
  
  ## المسار الجديد
  
  pending → receipt_uploaded → (AI) → auto_approved → contract_issued → active
*/

-- 1. إضافة trigger لإصدار العقد آلياً عند القبول الآلي
CREATE OR REPLACE FUNCTION auto_issue_contract_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم قبول الإيصال آلياً بثقة عالية
  IF NEW.status = 'auto_approved' 
     AND NEW.ai_confidence_score >= 90 
     AND OLD.status != 'auto_approved' THEN
    
    -- تحديث الحالة مباشرة إلى معتمد
    NEW.status := 'approved';
    NEW.finance_reviewed := true;
    NEW.finance_reviewed_at := NOW();
    
    -- إصدار العقد تلقائياً
    INSERT INTO b2f_contracts (
      sales_request_id,
      investor_name,
      investor_phone,
      farm_id,
      opportunity_id,
      total_amount,
      tree_quantity,
      contract_status,
      issue_date,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.investor_name,
      NEW.investor_phone,
      NEW.farm_id,
      NEW.opportunity_id,
      NEW.total_amount,
      NEW.tree_quantity,
      'issued',
      NOW(),
      NOW()
    )
    ON CONFLICT (sales_request_id) DO NOTHING;
    
    -- تحديث حقل contract_issued
    NEW.contract_issued := true;
    
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
      'تم اعتماد دفعتك وإصدار العقد الخاص بك تلقائياً. يمكنك الآن الاطلاع عليه من قسم عقودي.',
      NEW.investor_phone,
      NEW.id,
      false,
      NOW()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف trigger القديم
DROP TRIGGER IF EXISTS auto_issue_contract_trigger ON b2f_sales_requests;

-- إضافة trigger جديد
CREATE TRIGGER auto_issue_contract_trigger
BEFORE UPDATE ON b2f_sales_requests
FOR EACH ROW
EXECUTE FUNCTION auto_issue_contract_on_approval();

-- 2. دالة بسيطة للمراجعة اليدوية (للحالات الخاصة فقط)
CREATE OR REPLACE FUNCTION manually_approve_receipt(request_id uuid)
RETURNS jsonb AS $$
DECLARE
  request_record RECORD;
  contract_id uuid;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO request_record
  FROM b2f_sales_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
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
    sales_request_id,
    investor_name,
    investor_phone,
    farm_id,
    opportunity_id,
    total_amount,
    tree_quantity,
    contract_status,
    issue_date,
    created_at
  )
  VALUES (
    request_record.id,
    request_record.investor_name,
    request_record.investor_phone,
    request_record.farm_id,
    request_record.opportunity_id,
    request_record.total_amount,
    request_record.tree_quantity,
    'issued',
    NOW(),
    NOW()
  )
  ON CONFLICT (sales_request_id) DO NOTHING
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
    'تم اعتماد دفعتك وإصدار العقد الخاص بك. يمكنك الآن الاطلاع عليه من قسم عقودي.',
    request_record.investor_phone,
    request_id,
    false,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'contract_id', contract_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة RLS policy للدالة
CREATE POLICY "Admins can call manual approval function"
ON b2f_sales_requests
FOR UPDATE
TO authenticated
USING (is_b2f_admin(auth.uid()))
WITH CHECK (true);
