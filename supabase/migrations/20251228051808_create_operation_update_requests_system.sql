/*
  # نظام طلبات التحديث السريع

  1. الجدول الجديد
    - `b2f_operation_update_requests` - طلبات التحديث السريع من المستثمرين

  2. الحقول
    - بيانات المستثمر (رقم، اسم، user_id)
    - عدد الحجوزات المرتبطة
    - حالة الطلب (pending, processing, completed)
    - ملاحظات الإدارة (تملأ عند الرد)
    - تاريخ الإنشاء والتحديث

  3. الأمان
    - تفعيل RLS
    - سياسات للمستثمرين والإدارة

  4. الهدف
    - تسجيل طلبات التحديث السريع
    - تتبع حالة الطلب
    - لا يغير حالة الحجز تلقائياً
    - الإدارة تضيف التحديث يدوياً
*/

-- جدول طلبات التحديث السريع
CREATE TABLE IF NOT EXISTS b2f_operation_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- بيانات المستثمر
  investor_phone text NOT NULL,
  investor_name text,
  user_id text,
  
  -- تفاصيل الطلب
  reservations_count integer DEFAULT 0,
  request_note text,
  
  -- الحالة
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed')),
  
  -- ملاحظات الإدارة (تملأ عند الرد على الطلب)
  admin_notes text,
  admin_response_at timestamptz,
  
  -- التواريخ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE b2f_operation_update_requests ENABLE ROW LEVEL SECURITY;

-- سياسات RLS

-- المستثمرون يمكنهم إنشاء طلبات
CREATE POLICY "Anyone can create update requests"
  ON b2f_operation_update_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- المستثمرون يمكنهم قراءة طلباتهم فقط (بناءً على user_id أو رقم الهاتف)
CREATE POLICY "Investors can read own update requests"
  ON b2f_operation_update_requests FOR SELECT
  TO anon, authenticated
  USING (
    user_id = current_setting('app.user_id', true) 
    OR investor_phone = current_setting('app.user_phone', true)
  );

-- الإدارة يمكنها قراءة كل الطلبات
CREATE POLICY "Admin can read all update requests"
  ON b2f_operation_update_requests FOR SELECT
  TO authenticated
  USING (true);

-- الإدارة يمكنها تحديث الطلبات (تغيير الحالة، إضافة ملاحظات)
CREATE POLICY "Admin can update update requests"
  ON b2f_operation_update_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- الإدارة يمكنها حذف الطلبات
CREATE POLICY "Admin can delete update requests"
  ON b2f_operation_update_requests FOR DELETE
  TO authenticated
  USING (true);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_operation_update_requests_user_id 
  ON b2f_operation_update_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_operation_update_requests_investor_phone 
  ON b2f_operation_update_requests(investor_phone);

CREATE INDEX IF NOT EXISTS idx_operation_update_requests_status 
  ON b2f_operation_update_requests(status);

CREATE INDEX IF NOT EXISTS idx_operation_update_requests_created 
  ON b2f_operation_update_requests(created_at DESC);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_operation_update_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_operation_update_requests_updated_at ON b2f_operation_update_requests;

CREATE TRIGGER update_operation_update_requests_updated_at
  BEFORE UPDATE ON b2f_operation_update_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_operation_update_requests_updated_at();

-- تعليقات على الحقول
COMMENT ON TABLE b2f_operation_update_requests IS
'طلبات التحديث السريع من المستثمرين - لا تغير حالة الحجز تلقائياً';

COMMENT ON COLUMN b2f_operation_update_requests.status IS
'حالة الطلب: pending (قيد الانتظار)، processing (قيد المعالجة)، completed (مكتمل)';

COMMENT ON COLUMN b2f_operation_update_requests.admin_notes IS
'ملاحظات الإدارة عند الرد على الطلب - تضاف يدوياً من لوحة التحكم';

COMMENT ON COLUMN b2f_operation_update_requests.reservations_count IS
'عدد الحجوزات التي يطلب المستثمر تحديثها';
