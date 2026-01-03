/*
  # نظام طلبات الزيارة الكامل (Visit Requests System)

  1. جدول جديد:
    - `season_visit_requests` - طلبات زيارة المزارع
      - `id` (uuid, primary key)
      - `season_id` (uuid, foreign key → farm_seasons)
      - `farm_id` (uuid, foreign key → b2f_farms)
      - `request_id` (uuid, foreign key → b2f_investment_requests)
      - `investor_phone` (text) - رقم المستثمر
      - `investor_name` (text) - اسم المستثمر
      - `visit_type` (text) - نوع الزيارة (field_visit, video_visit, both)
      - `preferred_date` (date) - اليوم المفضل
      - `preferred_time` (text) - الفترة المفضلة (morning, evening)
      - `notes` (text) - ملاحظات المستثمر
      - `status` (text) - حالة الطلب (new, scheduled, completed, cancelled)
      - `admin_notes` (text) - ملاحظات الإدارة
      - `scheduled_date` (timestamptz) - التاريخ المجدول
      - `completed_at` (timestamptz) - تاريخ إتمام الزيارة
      - `created_at`, `updated_at`

  2. التأمين:
    - تفعيل RLS
    - سياسات للمستثمرين والإدارة

  3. الإشعارات:
    - إشعار للإدارة عند طلب جديد
    - إشعار للمستثمر عند تغيير الحالة
*/

-- جدول طلبات الزيارة
CREATE TABLE IF NOT EXISTS season_visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES farm_seasons(id) ON DELETE CASCADE NOT NULL,
  farm_id uuid REFERENCES b2f_farms(id) ON DELETE CASCADE NOT NULL,
  request_id uuid REFERENCES b2f_investment_requests(id) ON DELETE CASCADE NOT NULL,
  investor_phone text NOT NULL,
  investor_name text NOT NULL,
  visit_type text NOT NULL CHECK (visit_type IN ('field_visit', 'video_visit', 'both')),
  preferred_date date NOT NULL,
  preferred_time text NOT NULL CHECK (preferred_time IN ('morning', 'evening', 'anytime')),
  notes text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'scheduled', 'completed', 'cancelled')),
  admin_notes text,
  scheduled_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE season_visit_requests ENABLE ROW LEVEL SECURITY;

-- الإدارة - قراءة وكتابة كاملة
CREATE POLICY "Authenticated users can read all visit requests"
  ON season_visit_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert visit requests"
  ON season_visit_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update visit requests"
  ON season_visit_requests FOR UPDATE
  TO authenticated
  USING (true);

-- المستثمرون - قراءة طلباتهم فقط وإنشاء طلبات جديدة
CREATE POLICY "Anon can read own visit requests"
  ON season_visit_requests FOR SELECT
  TO anon
  USING (investor_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Anon can insert visit requests"
  ON season_visit_requests FOR INSERT
  TO anon
  WITH CHECK (investor_phone = current_setting('request.jwt.claims', true)::json->>'phone');

-- دالة لإرسال إشعار للمستثمر عند تغيير حالة الطلب
CREATE OR REPLACE FUNCTION notify_investor_on_visit_status_change()
RETURNS trigger AS $$
DECLARE
  v_message text;
  v_title text;
BEGIN
  -- إذا تغيرت الحالة
  IF OLD.status != NEW.status THEN
    -- تحديد الرسالة حسب الحالة الجديدة
    CASE NEW.status
      WHEN 'scheduled' THEN
        v_title := 'تمت جدولة الزيارة';
        v_message := 'تم استلام طلب الزيارة وجدولتها. سيتم التواصل معك قريباً لتأكيد التفاصيل.';
      WHEN 'completed' THEN
        v_title := 'تم تنفيذ الزيارة';
        v_message := 'تم تنفيذ الزيارة بنجاح. شكراً لاهتمامك ومتابعتك.';
      WHEN 'cancelled' THEN
        v_title := 'تم إلغاء طلب الزيارة';
        v_message := 'تم إلغاء طلب الزيارة. يمكنك تقديم طلب جديد في أي وقت.';
      ELSE
        v_title := 'تحديث طلب الزيارة';
        v_message := 'تم تحديث حالة طلب الزيارة الخاص بك.';
    END CASE;

    -- إرسال إشعار للمستثمر
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (NEW.investor_phone, v_title, v_message, 'visit_request', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لإرسال إشعار عند تغيير الحالة
CREATE TRIGGER trigger_notify_investor_on_visit_status
  AFTER UPDATE ON season_visit_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_investor_on_visit_status_change();

-- Trigger لإرسال إشعار للإدارة عند طلب جديد
CREATE OR REPLACE FUNCTION notify_admin_on_new_visit_request()
RETURNS trigger AS $$
BEGIN
  -- إشعار عام للإدارة (يمكن تحسينه لاحقاً)
  INSERT INTO notifications (user_id, title, message, type, related_id)
  VALUES (
    'admin',
    'طلب زيارة جديد',
    'تم استلام طلب زيارة جديد من ' || NEW.investor_name,
    'visit_request',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_admin_on_new_visit
  AFTER INSERT ON season_visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_new_visit_request();

-- تحديث timestamp عند التعديل
CREATE TRIGGER update_visit_requests_updated_at
  BEFORE UPDATE ON season_visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_visit_requests_season_id ON season_visit_requests(season_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_farm_id ON season_visit_requests(farm_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_request_id ON season_visit_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_investor_phone ON season_visit_requests(investor_phone);
CREATE INDEX IF NOT EXISTS idx_visit_requests_status ON season_visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_requests_created_at ON season_visit_requests(created_at);
