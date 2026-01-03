/*
  # إصلاح trigger_ai_receipt_analysis - حالة غير صالحة
  
  ## المشكلة
  الـ trigger يحاول تعيين status = 'pending_verification'
  لكن هذه القيمة غير موجودة في constraint valid_status
  
  ## الحل
  تعديل الـ trigger ليستخدم 'payment_uploaded' بدلاً من 'pending_verification'
  لأن 'payment_uploaded' موجودة بالفعل في القيم المسموحة
*/

-- إعادة إنشاء الـ function بدون تغيير status
CREATE OR REPLACE FUNCTION trigger_ai_receipt_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التأكد من أن payment_receipt_url تم تحديثه وليس null
  IF NEW.payment_receipt_url IS NOT NULL AND 
     (OLD.payment_receipt_url IS NULL OR OLD.payment_receipt_url != NEW.payment_receipt_url) THEN
    
    -- تحديث حالة التحقق بالذكاء الصناعي فقط (بدون تغيير status)
    -- لأن الكود الأمامي يحدد status بشكل صحيح
    NEW.ai_verification_status := 'pending';
    NEW.updated_at := now();
    
    -- ملاحظة: استدعاء Edge Function يتم من الواجهة الأمامية
    
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_ai_receipt_analysis() IS 'يحدث ai_verification_status فقط عند رفع إيصال جديد، بدون تعديل status الرئيسي';
