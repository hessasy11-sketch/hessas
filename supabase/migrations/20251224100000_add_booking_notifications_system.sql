/*
  # نظام إشعارات الحجوزات
  
  ## التحديثات
  
  1. إضافة trigger للإشعارات عند تحديث حالة الحجز
  2. إرسال إشعار تلقائي للمستثمر عند تغيير حالة الحجز
  
  ## السلوك
  
  - عند تغيير حالة الحجز من pending إلى confirmed: إشعار "تم تأكيد حجزك"
  - عند تغيير حالة الحجز من confirmed إلى completed: إشعار "تمت الموافقة على حجزك"
  - عند تغيير حالة الحجز إلى cancelled: إشعار "تم إلغاء حجزك"
*/

-- دالة لإرسال إشعار عند تحديث الحجز
CREATE OR REPLACE FUNCTION notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_opportunity_title text;
  v_notification_title text;
  v_notification_message text;
  v_notification_type text;
BEGIN
  -- التحقق من تغيير الحالة فقط
  IF OLD.status = NEW.status OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- الحصول على عنوان الفرصة
  SELECT title INTO v_opportunity_title
  FROM tree_rental_opportunities
  WHERE id = NEW.opportunity_id;

  -- تحديد نوع الإشعار والرسالة بناءً على الحالة الجديدة
  CASE NEW.status
    WHEN 'confirmed' THEN
      v_notification_type := 'booking_confirmed';
      v_notification_title := 'تم تأكيد حجزك';
      v_notification_message := 'تم تأكيد حجزك في: ' || v_opportunity_title;
    
    WHEN 'completed' THEN
      v_notification_type := 'booking_completed';
      v_notification_title := 'تمت الموافقة على حجزك';
      v_notification_message := 'تمت الموافقة النهائية على حجزك في: ' || v_opportunity_title;
    
    WHEN 'cancelled' THEN
      v_notification_type := 'booking_cancelled';
      v_notification_title := 'تم إلغاء حجزك';
      v_notification_message := 'تم إلغاء حجزك في: ' || v_opportunity_title;
    
    ELSE
      RETURN NEW;
  END CASE;

  -- إدراج الإشعار
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    is_read,
    created_at
  ) VALUES (
    NEW.user_id,
    v_notification_type,
    v_notification_title,
    v_notification_message,
    false,
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف trigger القديم إن وجد
DROP TRIGGER IF EXISTS booking_status_change_notification ON tree_rental_reservations;

-- إنشاء trigger جديد
CREATE TRIGGER booking_status_change_notification
  AFTER UPDATE ON tree_rental_reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_status_change();

-- التأكد من أن جدول notifications يدعم أنواع الإشعارات الجديدة
-- (هذا يفترض أن جدول notifications موجود بالفعل)
