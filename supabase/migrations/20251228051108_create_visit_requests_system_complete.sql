/*
  # إنشاء نظام طلبات الزيارة الكامل

  1. الجداول الجديدة
    - `b2f_visit_requests` - طلبات الزيارة من المستثمرين

  2. الحقول
    - بيانات المستثمر (رقم، اسم)
    - بيانات الحجز المرتبط
    - سبب الزيارة (اختياري)
    - تاريخ مقترح (اختياري، ليس تأكيد)
    - وسيلة تواصل مفضلة (call, whatsapp, internal)
    - ملاحظات المستثمر (اختياري)
    - حالة الطلب (pending, scheduled, done, canceled)
    - معلومات الموعد المحدد (تملأ من الإدارة)

  3. الأمان
    - تفعيل RLS
    - سياسات للمستثمرين والإدارة
*/

-- جدول طلبات الزيارة
CREATE TABLE IF NOT EXISTS b2f_visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- بيانات المستثمر
  investor_phone text NOT NULL,
  investor_name text,
  
  -- بيانات الحجز المرتبط
  booking_id uuid REFERENCES investment_reservations(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES b2f_opportunities(id) ON DELETE SET NULL,
  
  -- تفاصيل طلب الزيارة
  visit_reason text,
  investor_notes text,
  suggested_date date,
  contact_method text NOT NULL DEFAULT 'whatsapp' CHECK (contact_method IN ('call', 'whatsapp', 'internal')),
  
  -- الحالة
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'done', 'canceled')),
  
  -- تفاصيل الزيارة المحددة (تملأ من الإدارة بعد التنسيق)
  scheduled_date date,
  scheduled_time time,
  assigned_staff text,
  admin_notes text,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_visit_requests ENABLE ROW LEVEL SECURITY;

-- سياسات RLS

-- المستثمرون يمكنهم إنشاء طلبات
CREATE POLICY "Anyone can create visit requests"
  ON b2f_visit_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- المستثمرون يمكنهم قراءة طلباتهم فقط (بناءً على رقم الهاتف)
CREATE POLICY "Investors can read own visit requests"
  ON b2f_visit_requests FOR SELECT
  TO anon, authenticated
  USING (investor_phone = current_setting('app.user_phone', true));

-- الإدارة يمكنها قراءة كل الطلبات
CREATE POLICY "Admin can read all visit requests"
  ON b2f_visit_requests FOR SELECT
  TO authenticated
  USING (true);

-- الإدارة يمكنها تحديث الطلبات (تحديد مواعيد، تغيير الحالة)
CREATE POLICY "Admin can update visit requests"
  ON b2f_visit_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- الإدارة يمكنها حذف الطلبات
CREATE POLICY "Admin can delete visit requests"
  ON b2f_visit_requests FOR DELETE
  TO authenticated
  USING (true);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_visit_requests_investor_phone 
  ON b2f_visit_requests(investor_phone);

CREATE INDEX IF NOT EXISTS idx_visit_requests_status 
  ON b2f_visit_requests(status);

CREATE INDEX IF NOT EXISTS idx_visit_requests_booking 
  ON b2f_visit_requests(booking_id);

CREATE INDEX IF NOT EXISTS idx_visit_requests_created 
  ON b2f_visit_requests(created_at DESC);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_visit_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_visit_requests_updated_at ON b2f_visit_requests;

CREATE TRIGGER update_visit_requests_updated_at
  BEFORE UPDATE ON b2f_visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_requests_updated_at();

-- تعليقات على الحقول
COMMENT ON COLUMN b2f_visit_requests.visit_reason IS
'سبب الزيارة (اختياري) - مثل: معاينة الموقع، مناقشة خطة التشغيل';

COMMENT ON COLUMN b2f_visit_requests.suggested_date IS
'تاريخ مقترح للزيارة (اختياري، ليس تأكيد) - الإدارة تحدد الموعد النهائي بعد التنسيق';

COMMENT ON COLUMN b2f_visit_requests.contact_method IS
'وسيلة التواصل المفضلة: call (اتصال)، whatsapp (واتساب)، internal (رسالة داخل النظام)';

COMMENT ON COLUMN b2f_visit_requests.scheduled_date IS
'تاريخ الزيارة النهائي المحدد من الإدارة بعد التنسيق مع المستثمر';

COMMENT ON COLUMN b2f_visit_requests.status IS
'حالة الطلب: pending (قيد الانتظار)، scheduled (تم تحديد موعد)، done (تمت الزيارة)، canceled (ملغاة)';
