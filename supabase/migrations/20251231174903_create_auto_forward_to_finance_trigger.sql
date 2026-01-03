/*
  # إرسال الإيصالات للإدارة المالية تلقائياً

  1. التغييرات
    - إنشاء function لإرسال إشعار للمالية
    - إنشاء trigger عند تحديث حالة الإيصال من الذكاء الصناعي
    - إضافة سجل في جدول الإشعارات

  2. المسار
    - AI يحلل → auto_approved/auto_rejected
    - يرسل إشعار للمالية تلقائياً
    - المالية تراجع وتقرر
*/

-- إنشاء function لإشعار المالية
CREATE OR REPLACE FUNCTION notify_finance_team()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_notification_type TEXT;
BEGIN
  -- التحقق من أن التحديث من الذكاء الصناعي
  IF NEW.status IN ('auto_approved', 'auto_rejected') AND 
     OLD.status != NEW.status THEN
    
    -- تحديد نوع الإشعار بناءً على الحالة
    IF NEW.status = 'auto_approved' THEN
      v_notification_type := 'ai_auto_approved';
      v_notification_title := '✅ إيصال مقبول آلياً - يحتاج مراجعة مالية';
      v_notification_message := format(
        'تم قبول إيصال دفع آلياً للمستثمر: %s

المبلغ: %s ر.س
نسبة الثقة: %s%%
عدد الأشجار: %s

يرجى مراجعة الإيصال واعتماده لإصدار العقد.',
        NEW.investor_name,
        NEW.total_amount,
        NEW.verification_confidence_score,
        NEW.number_of_trees
      );
    ELSE
      v_notification_type := 'ai_auto_rejected';
      v_notification_title := '⚠️ إيصال مرفوض آلياً - يحتاج مراجعة مالية';
      v_notification_message := format(
        'تم رفض إيصال دفع آلياً للمستثمر: %s

المبلغ: %s ر.س
نسبة الثقة: %s%%
سبب الرفض: %s

يرجى المراجعة واتخاذ القرار النهائي.',
        NEW.investor_name,
        NEW.total_amount,
        NEW.verification_confidence_score,
        COALESCE(NEW.rejection_reason, 'غير محدد')
      );
    END IF;

    -- إضافة الإشعار لجدول الإشعارات
    INSERT INTO b2f_notifications (
      notification_type,
      title,
      message,
      target_audience,
      priority,
      related_entity_type,
      related_entity_id,
      metadata,
      is_read
    ) VALUES (
      v_notification_type,
      v_notification_title,
      v_notification_message,
      'finance_team',
      CASE WHEN NEW.status = 'auto_approved' THEN 'high' ELSE 'urgent' END,
      'sales_request',
      NEW.id,
      jsonb_build_object(
        'request_id', NEW.id,
        'investor_name', NEW.investor_name,
        'investor_phone', NEW.investor_phone,
        'amount', NEW.total_amount,
        'ai_status', NEW.status,
        'confidence_score', NEW.verification_confidence_score,
        'ai_verified_at', NEW.ai_verified_at
      ),
      false
    );

    RAISE NOTICE 'تم إرسال إشعار للمالية: % (الحالة: %)', NEW.id, NEW.status;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger
DROP TRIGGER IF EXISTS trigger_notify_finance_on_ai_decision ON b2f_sales_requests;

CREATE TRIGGER trigger_notify_finance_on_ai_decision
  AFTER UPDATE OF status, ai_verification_status ON b2f_sales_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_finance_team();

-- تعليق
COMMENT ON FUNCTION notify_finance_team() IS 'إرسال إشعار تلقائي للإدارة المالية عند قرار الذكاء الصناعي بالإيصال';
COMMENT ON TRIGGER trigger_notify_finance_on_ai_decision ON b2f_sales_requests IS 'يرسل إشعار للمالية تلقائياً عند تحليل الذكاء الصناعي للإيصال';
