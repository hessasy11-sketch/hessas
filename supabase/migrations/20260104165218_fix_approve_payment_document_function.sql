/*
  # إصلاح function اعتماد الإيصال

  ## المشكلة
  - الـ function تحاول تغيير الحالة إلى `payment_approved` لكن هذه غير موجودة
  - الحالات المسموح بها: receipt_approved, contract_issued, invoice_issued

  ## الحل
  - تغيير الحالة إلى `receipt_approved`
  - تحديث منطق الـ function لتتوافق مع workflow الصحيح
*/

-- إعادة إنشاء الـ function بشكل صحيح
CREATE OR REPLACE FUNCTION approve_payment_document(
  p_document_id UUID,
  p_approved_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_request_id UUID;
  v_invoice_id UUID;
BEGIN
  -- تحديث حالة الإيصال
  UPDATE b2f_payment_receipts
  SET 
    staff_decision = 'approved',
    staff_comment = 'تم الاعتماد من قبل ' || p_approved_by,
    reviewed_at = NOW()
  WHERE id = p_document_id
  RETURNING sales_request_id INTO v_request_id;
  
  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receipt not found');
  END IF;
  
  -- تحديث حالة الطلب إلى receipt_approved (حالة موجودة)
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_approved',
    updated_at = NOW()
  WHERE id = v_request_id;
  
  -- تحديث حالة الفاتورة إن وجدت
  UPDATE b2f_invoices
  SET 
    status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE sales_request_id = v_request_id
  RETURNING id INTO v_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'request_id', v_request_id,
    'invoice_id', v_invoice_id,
    'message', 'تم اعتماد السداد بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء function الرفض أيضاً
CREATE OR REPLACE FUNCTION reject_payment_document(
  p_document_id UUID,
  p_rejection_reason TEXT,
  p_rejected_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- تحديث حالة الإيصال
  UPDATE b2f_payment_receipts
  SET 
    staff_decision = 'rejected',
    staff_comment = p_rejection_reason,
    reviewed_at = NOW()
  WHERE id = p_document_id
  RETURNING sales_request_id INTO v_request_id;
  
  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receipt not found');
  END IF;
  
  -- إعادة الطلب لحالة receipt_needs_revision (حالة موجودة)
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_needs_revision',
    updated_at = NOW()
  WHERE id = v_request_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'request_id', v_request_id,
    'message', 'تم رفض الإيصال - المستثمر يمكنه رفع إيصال جديد'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION approve_payment_document TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reject_payment_document TO authenticated, anon;
