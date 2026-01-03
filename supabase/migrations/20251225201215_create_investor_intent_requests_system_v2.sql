/*
  # نظام طلبات الاهتمام الاستثماري (نسخة 2)

  1. جدول جديد
    - `investor_intent_requests`
      - يحتوي على جميع بيانات طلبات الاهتمام الاستثماري

  2. الأمان
    - تفعيل RLS
    - السماح للجميع بإضافة طلبات (بدون تسجيل)
    - السماح للمستخدمين المسجلين بعرض طلباتهم الخاصة (للمراحل القادمة)
*/

-- حذف الجدول القديم إن وجد
DROP TABLE IF EXISTS investor_intent_requests CASCADE;

-- إنشاء الجدول
CREATE TABLE investor_intent_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES investment_opportunity_cards(id) ON DELETE SET NULL,
  investor_intent text NOT NULL CHECK (investor_intent IN ('beginner', 'moderate', 'major')),
  tree_quantity integer NOT NULL CHECK (tree_quantity > 0),
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  preferred_contact_method text NOT NULL CHECK (preferred_contact_method IN ('whatsapp', 'call', 'sms')),
  notes text DEFAULT '',
  understands_pricing boolean NOT NULL DEFAULT false,
  opportunity_snapshot jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE investor_intent_requests ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بإضافة طلبات (بدون تسجيل)
CREATE POLICY "Anyone can submit investor intent requests"
  ON investor_intent_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح للجميع بعرض الطلبات (سيتم تقييد هذا لاحقاً)
CREATE POLICY "Anyone can view investor intent requests"
  ON investor_intent_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- السماح للمستخدمين المصادق عليهم بتحديث الطلبات (للإدارة)
CREATE POLICY "Authenticated users can update investor intent requests"
  ON investor_intent_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_investor_intent_requests_status 
  ON investor_intent_requests(status);

CREATE INDEX idx_investor_intent_requests_created_at 
  ON investor_intent_requests(created_at DESC);

CREATE INDEX idx_investor_intent_requests_opportunity 
  ON investor_intent_requests(opportunity_id);

-- وظيفة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_investor_intent_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger
CREATE TRIGGER update_investor_intent_requests_updated_at_trigger
  BEFORE UPDATE ON investor_intent_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_intent_requests_updated_at();
