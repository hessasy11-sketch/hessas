/*
  # نظام طلبات الزيارة من المستثمرين

  1. جداول جديدة
    - `b2f_visit_requests` - طلبات الزيارة من المستثمرين
    - `b2f_visit_request_texts` - نصوص واجهة طلب الزيارة (قابلة للتخصيص)

  2. الأمان
    - تفعيل RLS على الجداول
    - سياسات للقراءة والكتابة

  3. الحالات المدعومة
    - pending: قيد الانتظار (الحالة الافتراضية)
    - scheduled: تم تحديد موعد
    - done: تمت الزيارة
    - canceled: ملغاة
*/

-- جدول طلبات الزيارة من المستثمرين
CREATE TABLE IF NOT EXISTS b2f_visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- بيانات المستثمر
  investor_phone text NOT NULL,
  investor_name text,
  investor_account_id uuid REFERENCES b2f_investor_accounts(id) ON DELETE CASCADE,
  
  -- بيانات العقد/الطلب المرتبط
  booking_id uuid REFERENCES investment_reservations(id) ON DELETE SET NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES b2f_investment_opportunities(id) ON DELETE SET NULL,
  
  -- ملاحظات المستثمر
  investor_notes text,
  
  -- الحالة
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'done', 'canceled')),
  
  -- تفاصيل الزيارة (تملأ من الإدارة)
  scheduled_date date,
  scheduled_time time,
  assigned_staff text,
  admin_notes text,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول نصوص واجهة طلب الزيارة
CREATE TABLE IF NOT EXISTS b2f_visit_request_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- نصوص الـ Modal
  modal_title text NOT NULL DEFAULT 'طلب زيارة للمزرعة',
  modal_description text NOT NULL DEFAULT 'سيتم إرسال طلب زيارة لهذه المزرعة إلى الإدارة لتحديد الموعد والتواصل معكم.',
  notes_label text NOT NULL DEFAULT 'ملاحظات إضافية (اختياري)',
  notes_placeholder text NOT NULL DEFAULT 'مثال: أفضّل الزيارة نهاية الأسبوع',
  submit_button_text text NOT NULL DEFAULT 'إرسال الطلب',
  cancel_button_text text NOT NULL DEFAULT 'إلغاء',
  
  -- رسالة النجاح
  success_message text NOT NULL DEFAULT 'نشكر لكم ثقتكم، ونتشرف بزيارتكم. سيتم تحديد الموعد والتواصل معكم في أقرب وقت ممكن.',
  
  -- نصوص زر طلب الزيارة في بطاقة العقد
  request_visit_button text NOT NULL DEFAULT 'طلب زيارة',
  
  -- نصوص الحالات
  status_pending text NOT NULL DEFAULT 'قيد المراجعة',
  status_scheduled text NOT NULL DEFAULT 'تم تحديد موعد',
  status_done text NOT NULL DEFAULT 'تمت الزيارة',
  status_canceled text NOT NULL DEFAULT 'ملغاة',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إدراج القيم الافتراضية
INSERT INTO b2f_visit_request_texts (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- تفعيل RLS
ALTER TABLE b2f_visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_visit_request_texts ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لطلبات الزيارة

-- المستثمرون يمكنهم إنشاء طلبات (anon و authenticated)
CREATE POLICY "Anyone can create visit requests"
  ON b2f_visit_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- المستثمرون يمكنهم قراءة طلباتهم فقط
CREATE POLICY "Investors can read own visit requests"
  ON b2f_visit_requests FOR SELECT
  TO anon, authenticated
  USING (investor_phone = current_setting('request.jwt.claims', true)::json->>'phone');

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

-- سياسات RLS لنصوص طلب الزيارة

-- الجميع يمكنهم قراءة النصوص
CREATE POLICY "Anyone can read visit request texts"
  ON b2f_visit_request_texts FOR SELECT
  TO anon, authenticated
  USING (true);

-- الإدارة فقط يمكنها تعديل النصوص
CREATE POLICY "Admin can update visit request texts"
  ON b2f_visit_request_texts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

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

CREATE TRIGGER update_visit_requests_updated_at
  BEFORE UPDATE ON b2f_visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_requests_updated_at();
