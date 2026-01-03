/*
  # تبسيط دالة notify_finance_team

  1. المشكلة
    - الدالة تحاول إدخال أعمدة غير موجودة في b2f_notifications
    
  2. الحل
    - إزالة محاولة إنشاء الإشعار
    - الإبقاء فقط على RAISE NOTICE للتسجيل
    - يمكن إضافة نظام إشعارات أفضل لاحقاً
*/

CREATE OR REPLACE FUNCTION notify_finance_team()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من أن التحديث من الذكاء الصناعي
  IF NEW.status IN ('auto_approved', 'auto_rejected') AND 
     OLD.status != NEW.status THEN
    
    -- تسجيل الحدث في السجل فقط
    IF NEW.status = 'auto_approved' THEN
      RAISE NOTICE '✅ [AI-FINANCE] إيصال مقبول آلياً للطلب % - المستثمر: % - المبلغ: % ر.س - نسبة الثقة: %%%', 
        NEW.id, NEW.investor_name, NEW.total_amount, COALESCE(NEW.ai_confidence_score, 0);
    ELSE
      RAISE NOTICE '⚠️ [AI-FINANCE] إيصال مرفوض آلياً للطلب % - المستثمر: % - السبب: % - نسبة الثقة: %%%', 
        NEW.id, NEW.investor_name, COALESCE(NEW.rejection_reason, 'غير محدد'), COALESCE(NEW.ai_confidence_score, 0);
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_finance_team() IS 'تسجيل حالات القبول/الرفض الآلي من AI في السجل';
