/*
  # إضافة النصوص المعتمدة لنظام B2F

  1. جدول جديد
    - `b2f_system_messages`
      - `id` (uuid, primary key)
      - `section` (text) - القسم: sales, contracts, operations, investor_service
      - `stage` (text) - المرحلة داخل القسم
      - `message_text` (text) - النص المعتمد
      - `icon` (text) - الأيقونة المرافقة
      - `display_order` (integer) - ترتيب العرض
      - `is_active` (boolean) - حالة التفعيل
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. البيانات الأساسية
    - إضافة 8 نصوص معتمدة حسب المراحل

  3. الأمان
    - تفعيل RLS
    - سماح القراءة للجميع
    - التعديل للإدارة فقط
*/

-- إنشاء الجدول
CREATE TABLE IF NOT EXISTS b2f_system_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('sales', 'contracts', 'operations', 'investor_service')),
  stage text NOT NULL,
  message_text text NOT NULL,
  icon text DEFAULT '🌿',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة الفهارس
CREATE INDEX IF NOT EXISTS idx_b2f_system_messages_section ON b2f_system_messages(section);
CREATE INDEX IF NOT EXISTS idx_b2f_system_messages_stage ON b2f_system_messages(stage);
CREATE INDEX IF NOT EXISTS idx_b2f_system_messages_active ON b2f_system_messages(is_active);

-- تفعيل RLS
ALTER TABLE b2f_system_messages ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "السماح بقراءة النصوص للجميع"
  ON b2f_system_messages
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "السماح للإدارة بإدارة النصوص"
  ON b2f_system_messages
  FOR ALL
  TO authenticated
  USING (is_b2f_admin())
  WITH CHECK (is_b2f_admin());

-- Trigger للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_b2f_system_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_b2f_system_messages_timestamp
  BEFORE UPDATE ON b2f_system_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_b2f_system_messages_timestamp();

-- إضافة النصوص المعتمدة

-- 1️⃣ قسم المبيعات - بعد إرسال الطلب
INSERT INTO b2f_system_messages (section, stage, message_text, icon, display_order)
VALUES (
  'sales',
  'request_received',
  'شكرًا لتعاملك معنا 🌿 تم استلام طلبك وحجزه في قائمة الانتظار إلى حين اكتمال الحجوزات، وسيتم التواصل معك عند الانتقال للمرحلة التالية.',
  '✅',
  1
);

-- 2️⃣ قسم المبيعات - عند فتح الدفع
INSERT INTO b2f_system_messages (section, stage, message_text, icon, display_order)
VALUES (
  'sales',
  'payment_opened',
  'تم فتح الدفع لاستكمال طلبك 🌿 نرحب برفع إيصال السداد لتأكيد الحجز وانتقالك للمرحلة التالية.',
  '💳',
  2
);

-- 3️⃣ قسم المبيعات - بعد رفع الإيصال
INSERT INTO b2f_system_messages (section, stage, message_text, icon, display_order)
VALUES (
  'sales',
  'receipt_uploaded',
  'تم استلام الإيصال وسيتم مراجعته والتحقق من مطابقته قبل إكمال الإجراء.',
  '📄',
  3
);

-- 4️⃣ قسم المبيعات - إيصالات تحتاج مراجعة
INSERT INTO b2f_system_messages (section, stage, message_text, icon, display_order)
VALUES (
  'sales',
  'receipt_needs_review',
  'نحتاج توضيحًا لإكمال المعالجة: يرجى إعادة رفع الإيصال بصيغة أوضح أو بالمبلغ الصحيح.',
  '⚠️',
  4
);

-- 5️⃣ قسم العقود - بعد اعتماد الإيصال
INSERT INTO b2f_system_messages (section, stage, message_text, icon, display_order)
VALUES (
  'contracts',
  'receipt_approved',
  'تم اعتماد إيصال السداد وسيتم البدء في إعداد عقد الاستنفاع الخاص بك.',
  '✅',
  5
);

-- 6️⃣ قسم العقود - عند جاهزية العقد
INSERT INTO b2f_system_messages (section, stage, message_text, icon, display_order)
VALUES (
  'contracts',
  'contract_ready',
  'تم إصدار عقد الاستنفاع وهو جاهز للتنزيل من حسابك. نتمنى لك استثمارًا مباركًا.',
  '📋',
  6
);

-- 7️⃣ قسم التشغيل - عند دخول الموسم
INSERT INTO b2f_system_messages (section, stage, message_text, icon, display_order)
VALUES (
  'operations',
  'season_started',
  'شجرتك جاهزة للتشغيل ضمن الموسم الزراعي الحالي، ويمكن متابعة المستجدات من حسابك.',
  '🌳',
  7
);

-- 8️⃣ قسم خدمة المستثمر - بعد إرسال طلب
INSERT INTO b2f_system_messages (section, stage, message_text, icon, display_order)
VALUES (
  'investor_service',
  'request_submitted',
  'تم استلام طلبك وسيتم معالجته حسب الإجراء المطلوب، وسيصلك تحديث فور إتمام التنفيذ.',
  '📩',
  8
);

-- دالة مساعدة للحصول على النص حسب القسم والمرحلة
CREATE OR REPLACE FUNCTION get_b2f_system_message(
  p_section text,
  p_stage text
)
RETURNS text AS $$
DECLARE
  v_message text;
BEGIN
  SELECT message_text INTO v_message
  FROM b2f_system_messages
  WHERE section = p_section
    AND stage = p_stage
    AND is_active = true
  LIMIT 1;

  RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;