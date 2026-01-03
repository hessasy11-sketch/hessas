/*
  # إصلاح دالة notify_finance_team

  1. المشكلة
    - الدالة تستخدم verification_confidence_score (غير موجود)
    - الاسم الصحيح هو ai_confidence_score
    
  2. الإصلاح
    - تحديث جميع الإشارات لاستخدام ai_confidence_score
*/

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
        COALESCE(NEW.ai_confidence_score, 0),
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
        COALESCE(NEW.ai_confidence_score, 0),
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
        'confidence_score', COALESCE(NEW.ai_confidence_score, 0),
        'ai_verified_at', NEW.ai_verified_at
      ),
      false
    );
    
    RAISE NOTICE 'تم إرسال إشعار للمالية: % (الحالة: %)', NEW.id, NEW.status;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
