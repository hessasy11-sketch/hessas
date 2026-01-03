/*
  # إصلاح دالة اعتماد المالية - استخدام status صحيح
  
  المشكلة: الدالة تضع status = 'payment_approved' لكن هذه القيمة غير موجودة في constraint
  
  الحل: استخدام status = 'approved' (قيمة موجودة في constraint)
*/

CREATE OR REPLACE FUNCTION manually_approve_receipt(request_id uuid)
RETURNS jsonb AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- جلب بيانات الطلب
  SELECT * INTO request_record
  FROM b2f_sales_requests
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  -- تحديث حالة الطلب لجعله جاهز لإصدار العقد
  UPDATE b2f_sales_requests
  SET 
    status = 'approved',
    payment_status = 'payment_approved',
    finance_status = 'approved_for_contract',
    ready_for_contract = true,
    finance_reviewed = true,
    finance_reviewed_at = NOW(),
    contract_issued = false,
    contract_id = NULL,
    updated_at = NOW()
  WHERE id = request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم اعتماد الإيصال. الطلب الآن جاهز لإصدار عقد من قسم العقود'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION manually_approve_receipt TO anon, authenticated;

COMMENT ON FUNCTION manually_approve_receipt(uuid) IS 'اعتماد إيصال ماليًا وجعله جاهزًا لإصدار عقد من قسم العقود';
