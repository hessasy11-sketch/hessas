/*
  # تحديث مسار طلبات الاستثمار - المسار الجديد (3 خطوات)

  ## التغييرات:
  
  ### 1. حذف جميع قيود الحالات القديمة
  ### 2. تحديث البيانات الموجودة
  ### 3. إضافة قيود الحالات الجديدة
  ### 4. إنشاء الدوال والـ triggers
*/

-- 1. حذف جميع قيود الحالات القديمة
ALTER TABLE b2f_investment_requests 
DROP CONSTRAINT IF EXISTS valid_status CASCADE;

ALTER TABLE b2f_investment_requests 
DROP CONSTRAINT IF EXISTS b2f_investment_requests_status_check CASCADE;

-- 2. إضافة الحقول الجديدة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' 
    AND column_name = 'financial_reviewer_notes'
  ) THEN
    ALTER TABLE b2f_investment_requests 
    ADD COLUMN financial_reviewer_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' 
    AND column_name = 'payment_verification_date'
  ) THEN
    ALTER TABLE b2f_investment_requests 
    ADD COLUMN payment_verification_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' 
    AND column_name = 'contract_issued_date'
  ) THEN
    ALTER TABLE b2f_investment_requests 
    ADD COLUMN contract_issued_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' 
    AND column_name = 'collection_batch_date'
  ) THEN
    ALTER TABLE b2f_investment_requests 
    ADD COLUMN collection_batch_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'b2f_investment_requests' 
    AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE b2f_investment_requests 
    ADD COLUMN batch_number text;
  END IF;
END $$;

-- 3. تحديث جميع الطلبات الموجودة للحالات الجديدة
UPDATE b2f_investment_requests 
SET status = 'in_collection_queue',
    collection_batch_date = COALESCE(collection_batch_date, created_at)
WHERE status IN ('pending', 'waiting_in_group');

-- 4. إضافة القيد الجديد
ALTER TABLE b2f_investment_requests
ADD CONSTRAINT b2f_investment_requests_status_check 
CHECK (status IN (
  'pending',
  'in_collection_queue',
  'payment_open',
  'pending_verification',
  'approved',
  'ready_for_contract',
  'rejected'
));

-- 5. إنشاء دالة لنقل الطلبات تلقائياً لقائمة التجميع
CREATE OR REPLACE FUNCTION auto_move_to_collection_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    NEW.status := 'in_collection_queue';
    NEW.collection_batch_date := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_collection_queue ON b2f_investment_requests;
CREATE TRIGGER trigger_auto_collection_queue
  BEFORE INSERT ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_move_to_collection_queue();

-- 6. دالة فتح الدفع
CREATE OR REPLACE FUNCTION open_payment_for_batch(batch_requests uuid[])
RETURNS TABLE (success boolean, message text, updated_count integer) 
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE b2f_investment_requests
  SET status = 'payment_open', updated_at = now()
  WHERE id = ANY(batch_requests) AND status = 'in_collection_queue';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT true, format('تم فتح الدفع لـ %s طلب', v_count), v_count;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. دالة مراجعة الإيصال
CREATE OR REPLACE FUNCTION review_payment_receipt(
  p_request_id uuid,
  p_approved boolean,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (success boolean, message text) 
AS $$
BEGIN
  IF p_approved THEN
    UPDATE b2f_investment_requests
    SET status = 'approved',
        payment_verification_date = now(),
        financial_reviewer_notes = p_notes,
        updated_at = now()
    WHERE id = p_request_id AND status = 'pending_verification';
    RETURN QUERY SELECT true, 'تم اعتماد الإيصال بنجاح';
  ELSE
    UPDATE b2f_investment_requests
    SET status = 'payment_open',
        financial_reviewer_notes = p_notes,
        updated_at = now()
    WHERE id = p_request_id AND status = 'pending_verification';
    RETURN QUERY SELECT true, 'تم رفض الإيصال وإعادته للمستثمر';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. دالة إصدار العقود
CREATE OR REPLACE FUNCTION issue_contracts_for_approved(approved_requests uuid[])
RETURNS TABLE (success boolean, message text, contracts_issued integer) 
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE b2f_investment_requests
  SET status = 'ready_for_contract',
      contract_issued_date = now(),
      updated_at = now()
  WHERE id = ANY(approved_requests) AND status = 'approved';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT true, format('تم إصدار %s عقد', v_count), v_count;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. trigger رفع الإيصال
CREATE OR REPLACE FUNCTION on_receipt_uploaded()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_receipt_url IS NOT NULL 
     AND OLD.payment_receipt_url IS NULL 
     AND NEW.status = 'payment_open' THEN
    NEW.status := 'pending_verification';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_receipt_uploaded ON b2f_investment_requests;
CREATE TRIGGER trigger_receipt_uploaded
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION on_receipt_uploaded();