/*
  # إصلاح trigger الإشعارات التلقائية
  
  المشكلة:
  - الدالة send_payment_status_notification() تستخدم type = 'payment_update'
  - لكن الـ constraint يسمح فقط بـ: 'payment'
  
  الحل: تعديل الدالة لاستخدام 'payment' بدلاً من 'payment_update'
*/

CREATE OR REPLACE FUNCTION send_payment_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        notification_title := 'تم اعتماد السداد ✅';
        notification_message := 'تم اعتماد سداد طلبك رقم ' || substring(NEW.id::text, 1, 8) || '، يمكنك متابعة تفاصيل العقد من تبويب العقود';
        
      WHEN 'payment_rejected' THEN
        notification_title := 'يتطلب إعادة إثبات السداد ❌';
        notification_message := 'تم رفض مستند الدفع لطلبك رقم ' || substring(NEW.id::text, 1, 8) || '، يرجى إعادة تقديم مستند دفع جديد من تبويب المالية';
        
      WHEN 'payment_submitted' THEN
        notification_title := 'تم استلام مستند الدفع 📄';
        notification_message := 'تم استلام مستند الدفع لطلبك رقم ' || substring(NEW.id::text, 1, 8) || '، وهو الآن قيد المراجعة من الإدارة';
        
      ELSE
        RETURN NEW;
    END CASE;
    
    -- إدراج الإشعار باستخدام investor_account_id
    -- استخدام 'payment' بدلاً من 'payment_update'
    BEGIN
      INSERT INTO b2f_notifications (
        investor_account_id,
        title,
        message,
        type,
        priority,
        metadata
      ) VALUES (
        v_account_id,
        notification_title,
        notification_message,
        'payment',
        'important',
        jsonb_build_object(
          'sales_request_id', NEW.id,
          'payment_status', NEW.payment_status
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- تجاهل خطأ الإشعار واستمر
        NULL;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$;