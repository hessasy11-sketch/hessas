/*
  # إضافة تحليل تلقائي للإيصالات بالذكاء الصناعي
  
  عند رفع إيصال جديد، يتم:
  1. تحديث حالة الطلب إلى "receipt_uploaded"
  2. استدعاء edge function للتحليل بالذكاء الصناعي
  3. الذكاء الصناعي يصنف الإيصال إلى:
     - looks_good: يبدو سليماً
     - needs_review: يحتاج مراجعة
     
  ⚠️ مهم: الذكاء الصناعي لا يعتمد نهائياً، فقط يصنف
*/

-- دالة يتم استدعاؤها عند رفع إيصال جديد
CREATE OR REPLACE FUNCTION on_receipt_uploaded_for_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث حالة الطلب إلى "receipt_uploaded"
  UPDATE b2f_sales_requests
  SET 
    status = 'receipt_uploaded',
    receipt_uploaded_at = now(),
    updated_at = now()
  WHERE id = NEW.sales_request_id;
  
  -- هنا يمكن استدعاء edge function للتحليل
  -- سيتم تحديث ai_classification لاحقاً بواسطة edge function
  
  RETURN NEW;
END;
$$;

-- Trigger عند إدراج إيصال جديد
DROP TRIGGER IF EXISTS trigger_receipt_uploaded_sales ON b2f_payment_receipts;
CREATE TRIGGER trigger_receipt_uploaded_sales
  AFTER INSERT ON b2f_payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION on_receipt_uploaded_for_sales();

-- دالة لتحديث تصنيف AI بعد التحليل
CREATE OR REPLACE FUNCTION update_receipt_ai_classification(
  receipt_uuid uuid,
  classification text,
  analysis_data jsonb,
  confidence numeric DEFAULT 0.0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
  v_new_status text;
BEGIN
  -- تحديث تصنيف الإيصال
  UPDATE b2f_payment_receipts
  SET 
    ai_classification = classification,
    ai_analysis_result = analysis_data,
    ai_confidence_score = confidence
  WHERE id = receipt_uuid
  RETURNING sales_request_id INTO v_request_id;
  
  -- تحديد الحالة الجديدة للطلب حسب التصنيف
  IF classification = 'needs_review' THEN
    v_new_status := 'receipt_needs_revision';
  ELSE
    v_new_status := 'receipt_under_review';
  END IF;
  
  -- تحديث حالة الطلب
  UPDATE b2f_sales_requests
  SET 
    status = v_new_status,
    updated_at = now()
  WHERE id = v_request_id;
END;
$$;