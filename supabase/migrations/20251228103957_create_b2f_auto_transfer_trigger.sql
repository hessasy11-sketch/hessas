/*
  # Trigger للترحيل التلقائي لطلبات الاستثمار B2F
  
  عند تغيير حالة الطلب، يتم تلقائياً:
  1. تحديث operational_status
  2. تحديث operational_phase
  3. تحديث operational_progress
  4. إضافة سجل في b2f_operational_timeline
  5. تحديث next_action و next_action_date
*/

CREATE OR REPLACE FUNCTION update_b2f_operational_status_from_request_status()
RETURNS TRIGGER AS $$
DECLARE
  new_operational_status TEXT;
  new_operational_phase TEXT;
  new_progress INTEGER;
  action_description TEXT;
BEGIN
  -- تحديد الحالة التشغيلية بناءً على حالة الطلب
  CASE NEW.status
    WHEN 'new' THEN
      new_operational_status := 'not_started';
      new_operational_phase := 'طلب جديد';
      new_progress := 5;
      action_description := 'تم إنشاء الطلب';
      
    WHEN 'approved' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'تمت الموافقة';
      new_progress := 15;
      action_description := 'تمت الموافقة على الطلب';
      
    WHEN 'awaiting_payment' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'في انتظار الدفع';
      new_progress := 20;
      action_description := 'في انتظار إتمام الدفع';
      
    WHEN 'payment_uploaded' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'التحقق من الدفع';
      new_progress := 30;
      action_description := 'تم رفع إيصال الدفع';
      
    WHEN 'payment_verified', 'approved_pending_payment' THEN
      new_operational_status := 'preparation';
      new_operational_phase := 'تجهيز العقد';
      new_progress := 45;
      action_description := 'تم التحقق من الدفع';
      
    WHEN 'awaiting_contract', 'contract_ready' THEN
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
      
    WHEN 'transferred_to_operations', 'active', 'contacted' THEN
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
      
    WHEN 'cancelled', 'rejected' THEN
      new_operational_status := 'cancelled';
      new_operational_phase := 'ملغي';
      new_progress := 0;
      action_description := 'تم إلغاء الطلب';
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
    INSERT INTO b2f_operational_timeline (
      request_id,
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

-- إنشاء Trigger
DROP TRIGGER IF EXISTS trigger_update_b2f_operational_status ON b2f_investment_requests;
CREATE TRIGGER trigger_update_b2f_operational_status
  BEFORE UPDATE ON b2f_investment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_operational_status_from_request_status();
