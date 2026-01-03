/*
  # تحسين نظام طلبات الاهتمام الاستثماري للإدارة

  1. تحسينات
    - إضافة حقل `admin_notes` - ملاحظات داخلية للإدارة
    - إضافة حقل `converted_to_booking` - تعليم الطلب كمحول لحجز
    - إضافة حقل `priority_level` - مستوى الأولوية
    - إضافة حالات جديدة للطلب
    - إضافة حقل `last_contact_date` - تاريخ آخر تواصل

  2. الحالات الجديدة
    - new: جديد - لم يتم التواصل بعد
    - contacted: تم التواصل - يفكر
    - interested: يرغب بالاستمرار - تجهيز عرض
    - converted: تم التحويل إلى حجز فعلي
    - closed: مغلق - غير مهتم حاليًا
    - cancelled: ملغي
*/

-- إضافة حقول جديدة
DO $$
BEGIN
  -- إضافة حقل ملاحظات الإدارة
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_intent_requests' 
    AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE investor_intent_requests 
    ADD COLUMN admin_notes text DEFAULT '';
  END IF;

  -- إضافة حقل تحويل لحجز
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_intent_requests' 
    AND column_name = 'converted_to_booking'
  ) THEN
    ALTER TABLE investor_intent_requests 
    ADD COLUMN converted_to_booking boolean DEFAULT false;
  END IF;

  -- إضافة حقل مستوى الأولوية
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_intent_requests' 
    AND column_name = 'priority_level'
  ) THEN
    ALTER TABLE investor_intent_requests 
    ADD COLUMN priority_level text DEFAULT 'normal' 
    CHECK (priority_level IN ('low', 'normal', 'high', 'urgent'));
  END IF;

  -- إضافة حقل آخر تاريخ تواصل
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_intent_requests' 
    AND column_name = 'last_contact_date'
  ) THEN
    ALTER TABLE investor_intent_requests 
    ADD COLUMN last_contact_date timestamptz;
  END IF;

  -- إضافة حقل معرف الحجز المحول
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_intent_requests' 
    AND column_name = 'converted_booking_id'
  ) THEN
    ALTER TABLE investor_intent_requests 
    ADD COLUMN converted_booking_id uuid;
  END IF;
END $$;

-- تحديث القيود على حقل status
ALTER TABLE investor_intent_requests 
DROP CONSTRAINT IF EXISTS investor_intent_requests_status_check;

ALTER TABLE investor_intent_requests
ADD CONSTRAINT investor_intent_requests_status_check 
CHECK (status IN ('new', 'contacted', 'interested', 'converted', 'closed', 'cancelled'));

-- تحديث الطلبات القديمة
UPDATE investor_intent_requests 
SET status = 'new' 
WHERE status = 'pending';

-- إنشاء فهارس إضافية
CREATE INDEX IF NOT EXISTS idx_investor_intent_requests_priority 
  ON investor_intent_requests(priority_level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investor_intent_requests_converted 
  ON investor_intent_requests(converted_to_booking);

CREATE INDEX IF NOT EXISTS idx_investor_intent_requests_intent 
  ON investor_intent_requests(investor_intent);

-- وظيفة لتحديث مستوى الأولوية تلقائياً بناءً على نية الاستثمار
CREATE OR REPLACE FUNCTION update_request_priority()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديد الأولوية بناءً على نية الاستثمار
  IF NEW.investor_intent = 'major' THEN
    NEW.priority_level = 'high';
  ELSIF NEW.investor_intent = 'moderate' THEN
    NEW.priority_level = 'normal';
  ELSE
    NEW.priority_level = 'normal';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لتحديث الأولوية عند الإضافة
DROP TRIGGER IF EXISTS set_request_priority_trigger ON investor_intent_requests;

CREATE TRIGGER set_request_priority_trigger
  BEFORE INSERT ON investor_intent_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_request_priority();

-- وظيفة لتحديث تاريخ آخر تواصل تلقائياً
CREATE OR REPLACE FUNCTION update_last_contact_date()
RETURNS TRIGGER AS $$
BEGIN
  -- عند تغيير الحالة إلى contacted أو interested
  IF NEW.status IN ('contacted', 'interested') AND OLD.status != NEW.status THEN
    NEW.last_contact_date = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لتحديث تاريخ التواصل
DROP TRIGGER IF EXISTS update_contact_date_trigger ON investor_intent_requests;

CREATE TRIGGER update_contact_date_trigger
  BEFORE UPDATE ON investor_intent_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_last_contact_date();
