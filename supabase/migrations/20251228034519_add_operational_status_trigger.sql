/*
  # Trigger لتحديث الحالة التشغيلية تلقائياً
  
  عند تغيير حالة الحجز، يتم:
  1. تحديث operational_status
  2. تحديث operational_phase
  3. تحديث operational_progress
  4. إضافة سجل في operational_timeline
*/

CREATE OR REPLACE FUNCTION update_operational_status_from_booking_status()
RETURNS TRIGGER AS $$
DECLARE
  new_operational_status TEXT;
  new_operational_phase TEXT;
  new_progress INTEGER;
  action_description TEXT;
BEGIN
  -- تحديد الحالة التشغيلية بناءً على حالة الحجز
  CASE NEW.status
    WHEN 'pending' THEN
      new_operational_status := 'not_started';
      new_operational_phase := 'في انتظار الموافقة';
      new_progress := 5;
      action_description := 'تم إنشاء الحجز';
      
    WHEN 'approved' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'تجهيز المستندات';
      new_progress := 15;
      action_description := 'تمت الموافقة على الحجز';
      
    WHEN 'awaiting_payment' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'في انتظار الدفع';
      new_progress := 20;
      action_description := 'في انتظار إتمام الدفع';
      
    WHEN 'payment_submitted' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'التحقق من الدفع';
      new_progress := 30;
      action_description := 'تم رفع إيصال الدفع';
      
    WHEN 'payment_verified', 'approved_pending_payment' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'تجهيز العقد';
      new_progress := 45;
      action_description := 'تم التحقق من الدفع';
      
    WHEN 'awaiting_contract' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'إصدار العقد والمستندات';
      new_progress := 55;
      action_description := 'جاري إصدار العقد';
      
    WHEN 'contract_issued' THEN
      new_operational_status := 'planting';
      new_operational_phase := 'إدخال في خطة الزراعة';
      new_progress := 70;
      action_description := 'تم إصدار العقد';
      NEW.next_action := 'جدولة الزراعة';
      NEW.next_action_date := CURRENT_DATE + INTERVAL '7 days';
      
    WHEN 'active' THEN
      new_operational_status := 'monitoring';
      new_operational_phase := 'قيد التشغيل والمتابعة';
      new_progress := 85;
      action_description := 'بدء التشغيل الفعلي';
      NEW.next_action := 'زيارة ميدانية';
      NEW.next_action_date := CURRENT_DATE + INTERVAL '14 days';
      
    WHEN 'completed' THEN
      new_operational_status := 'completed';
      new_operational_phase := 'مكتمل';
      new_progress := 100;
      action_description := 'تم إكمال جميع المراحل';
      NEW.next_action := NULL;
      NEW.next_action_date := NULL;
      
    WHEN 'cancelled' THEN
      new_operational_status := 'cancelled';
      new_operational_phase := 'ملغي';
      new_progress := 0;
      action_description := 'تم إلغاء الحجز';
      NEW.next_action := NULL;
      NEW.next_action_date := NULL;
      
    ELSE
      new_operational_status := COALESCE(OLD.operational_status, 'not_started');
      new_operational_phase := OLD.operational_phase;
      new_progress := COALESCE(OLD.operational_progress, 0);
      action_description := 'تحديث الحالة';
  END CASE;

  -- تحديث الحقول فقط إذا تغيرت الحالة
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.operational_status := new_operational_status;
    NEW.operational_phase := new_operational_phase;
    NEW.operational_progress := new_progress;
    NEW.operational_updated_at := now();

    -- إضافة سجل في timeline
    INSERT INTO operational_timeline (
      reservation_id,
      from_status,
      to_status,
      operational_phase,
      action_taken,
      notes,
      progress
    ) VALUES (
      NEW.id,
      OLD.operational_status,
      new_operational_status,
      new_operational_phase,
      action_description,
      NEW.admin_notes,
      new_progress
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_operational_status ON investment_reservations;
CREATE TRIGGER trigger_update_operational_status
  BEFORE UPDATE ON investment_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_operational_status_from_booking_status();

-- تحديث الحجوزات الموجودة
UPDATE investment_reservations
SET 
  operational_status = CASE status
    WHEN 'pending' THEN 'not_started'
    WHEN 'approved' THEN 'preparation'
    WHEN 'awaiting_payment' THEN 'preparation'
    WHEN 'payment_submitted' THEN 'preparation'
    WHEN 'payment_verified' THEN 'preparation'
    WHEN 'approved_pending_payment' THEN 'preparation'
    WHEN 'awaiting_contract' THEN 'preparation'
    WHEN 'contract_issued' THEN 'planting'
    WHEN 'active' THEN 'monitoring'
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'not_started'
  END,
  operational_phase = CASE status
    WHEN 'pending' THEN 'في انتظار الموافقة'
    WHEN 'approved' THEN 'تجهيز المستندات'
    WHEN 'awaiting_payment' THEN 'في انتظار الدفع'
    WHEN 'payment_submitted' THEN 'التحقق من الدفع'
    WHEN 'payment_verified' THEN 'تجهيز العقد'
    WHEN 'approved_pending_payment' THEN 'تجهيز العقد'
    WHEN 'awaiting_contract' THEN 'إصدار العقد والمستندات'
    WHEN 'contract_issued' THEN 'إدخال في خطة الزراعة'
    WHEN 'active' THEN 'قيد التشغيل والمتابعة'
    WHEN 'completed' THEN 'مكتمل'
    WHEN 'cancelled' THEN 'ملغي'
    ELSE 'في انتظار الموافقة'
  END,
  operational_progress = CASE status
    WHEN 'pending' THEN 5
    WHEN 'approved' THEN 15
    WHEN 'awaiting_payment' THEN 20
    WHEN 'payment_submitted' THEN 30
    WHEN 'payment_verified' THEN 45
    WHEN 'approved_pending_payment' THEN 45
    WHEN 'awaiting_contract' THEN 55
    WHEN 'contract_issued' THEN 70
    WHEN 'active' THEN 85
    WHEN 'completed' THEN 100
    ELSE 0
  END,
  operational_updated_at = now()
WHERE operational_status IS NULL OR operational_progress IS NULL;
