/*
  # إصلاح دالة إشعارات السداد - تصحيح اسم العمود
  
  ## المشكلة:
  - الدالة تستخدم phone لكن العمود الصحيح هو contact_phone
  
  ## الحل:
  - تحديث الدالة لاستخدام contact_phone
*/

-- إعادة إنشاء الدالة بشكل صحيح
CREATE OR REPLACE FUNCTION send_payment_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title text;
  notification_message text;
  v_account_id uuid;
BEGIN
  -- فقط إذا تغيرت حالة الدفع
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    
    -- الحصول على investor_account_id من رقم الهاتف
    SELECT id INTO v_account_id
    FROM b2f_investor_accounts
    WHERE contact_phone = NEW.investor_phone
    LIMIT 1;
    
    -- إذا لم يتم العثور على حساب، لا نرسل إشعار
    IF v_account_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- تحديد الرسالة حسب الحالة
    CASE NEW.payment_status
      WHEN 'payment_approved' THEN
        notification_title := 'تم اعتماد السداد';
        notification_message := 'تم اعتماد سداد طلبك رقم ' || substring(NEW.id::text, 1, 8) || '، يمكنك متابعة تفاصيل العقد من تبويب العقود';
      
      WHEN 'payment_rejected' THEN
        notification_title := 'يتطلب إعادة إثبات السداد';
        notification_message := 'تم رفض مستند الدفع لطلبك رقم ' || substring(NEW.id::text, 1, 8) || '، يرجى إعادة تقديم مستند دفع جديد من تبويب المالية';
      
      WHEN 'payment_submitted' THEN
        notification_title := 'تم استلام مستند الدفع';
        notification_message := 'تم استلام مستند الدفع لطلبك رقم ' || substring(NEW.id::text, 1, 8) || '، وهو الآن قيد المراجعة من الإدارة';
      
      ELSE
        RETURN NEW;
    END CASE;
    
    -- إدراج الإشعار باستخدام investor_account_id
    INSERT INTO b2f_notifications (
      investor_account_id,
      title,
      message,
      type,
      metadata
    ) VALUES (
      v_account_id,
      notification_title,
      notification_message,
      'payment_update',
      jsonb_build_object(
        'sales_request_id', NEW.id,
        'payment_status', NEW.payment_status
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;