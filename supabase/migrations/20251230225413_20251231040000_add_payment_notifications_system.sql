/*
  # نظام إشعارات السداد التلقائية
  
  ## التغييرات:
  
  1. دالة لإرسال إشعارات عند تغيير حالة السداد
  2. Trigger تلقائي عند تحديث payment_status
*/

-- دالة إرسال إشعار السداد
CREATE OR REPLACE FUNCTION send_payment_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title text;
  notification_message text;
BEGIN
  -- فقط إذا تغيرت حالة الدفع
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    
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
    
    -- إدراج الإشعار
    INSERT INTO b2f_notifications (
      investor_phone,
      title,
      message,
      type,
      related_id
    ) VALUES (
      NEW.investor_phone,
      notification_title,
      notification_message,
      'payment_update',
      NEW.id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف الـ trigger القديم إذا كان موجوداً
DROP TRIGGER IF EXISTS trigger_send_payment_notification ON b2f_sales_requests;

-- إنشاء الـ trigger
CREATE TRIGGER trigger_send_payment_notification
  AFTER UPDATE ON b2f_sales_requests
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION send_payment_status_notification();

-- Comment
COMMENT ON FUNCTION send_payment_status_notification IS 
'يرسل إشعاراً للمستثمر عند تغيير حالة السداد';
