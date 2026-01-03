/*
  # نظام المساعد الذكي لاستثمار أشجار المزارع

  1. الجداول الجديدة
    - `b2f_ai_knowledge_base` - قاعدة المعرفة
    - `b2f_ai_conversations` - المحادثات
    - `b2f_ai_messages` - الرسائل
    - `b2f_ai_frequent_questions` - الأسئلة المتكررة
    - `b2f_ai_system_notifications` - إشعارات النظام

  2. الأمان
    - RLS مفتوح للمستثمرين
    - الإدارة ترى كل شيء
*/

-- جدول قاعدة المعرفة
CREATE TABLE IF NOT EXISTS b2f_ai_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('faq', 'term', 'process', 'guidance')),
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  usage_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول المحادثات
CREATE TABLE IF NOT EXISTS b2f_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_phone text NOT NULL,
  investor_account_id uuid,
  title text DEFAULT 'محادثة جديدة',
  is_active boolean DEFAULT true,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- جدول الرسائل
CREATE TABLE IF NOT EXISTS b2f_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES b2f_ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  matched_knowledge_id uuid REFERENCES b2f_ai_knowledge_base(id) ON DELETE SET NULL,
  is_helpful boolean,
  created_at timestamptz DEFAULT now()
);

-- جدول الأسئلة المتكررة
CREATE TABLE IF NOT EXISTS b2f_ai_frequent_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL UNIQUE,
  question_count integer DEFAULT 1,
  is_answered boolean DEFAULT false,
  assigned_knowledge_id uuid REFERENCES b2f_ai_knowledge_base(id) ON DELETE SET NULL,
  last_asked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- جدول إشعارات النظام
CREATE TABLE IF NOT EXISTS b2f_ai_system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_phone text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN (
    'payment_approved', 'season_started', 'harvest_ready',
    'certificate_issued', 'visit_approved', 'contract_ready'
  )),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_request_id uuid,
  created_at timestamptz DEFAULT now()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON b2f_ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON b2f_ai_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON b2f_ai_knowledge_base USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON b2f_ai_conversations(investor_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON b2f_ai_conversations(is_active);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON b2f_ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON b2f_ai_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_frequent_questions_count ON b2f_ai_frequent_questions(question_count DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_phone ON b2f_ai_system_notifications(investor_phone);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON b2f_ai_system_notifications(is_read);

-- تفعيل RLS
ALTER TABLE b2f_ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_ai_frequent_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_ai_system_notifications ENABLE ROW LEVEL SECURITY;

-- سياسات بسيطة مفتوحة للجميع
CREATE POLICY "الجميع يقرأ قاعدة المعرفة"
  ON b2f_ai_knowledge_base FOR SELECT
  USING (is_active = true);

CREATE POLICY "الإدارة تدير قاعدة المعرفة"
  ON b2f_ai_knowledge_base FOR ALL
  USING (true);

CREATE POLICY "الجميع يرى المحادثات"
  ON b2f_ai_conversations FOR SELECT
  USING (true);

CREATE POLICY "الجميع ينشئ محادثات"
  ON b2f_ai_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "الجميع يرى الرسائل"
  ON b2f_ai_messages FOR SELECT
  USING (true);

CREATE POLICY "الجميع يرسل رسائل"
  ON b2f_ai_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "الجميع يرى الأسئلة المتكررة"
  ON b2f_ai_frequent_questions FOR ALL
  USING (true);

CREATE POLICY "الجميع يرى الإشعارات"
  ON b2f_ai_system_notifications FOR SELECT
  USING (true);

CREATE POLICY "الجميع يحدث الإشعارات"
  ON b2f_ai_system_notifications FOR UPDATE
  USING (true);

CREATE POLICY "الجميع ينشئ إشعارات"
  ON b2f_ai_system_notifications FOR INSERT
  WITH CHECK (true);

-- دالة لإضافة سؤال متكرر
CREATE OR REPLACE FUNCTION increment_frequent_question(question_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO b2f_ai_frequent_questions (question_text, question_count, last_asked_at)
  VALUES (question_text, 1, now())
  ON CONFLICT (question_text)
  DO UPDATE SET
    question_count = b2f_ai_frequent_questions.question_count + 1,
    last_asked_at = now();
END;
$$;

-- دالة لإضافة إشعار نظام
CREATE OR REPLACE FUNCTION add_b2f_system_notification(
  p_investor_phone text,
  p_notification_type text,
  p_title text,
  p_message text,
  p_related_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO b2f_ai_system_notifications (
    investor_phone,
    notification_type,
    title,
    message,
    related_request_id
  )
  VALUES (
    p_investor_phone,
    p_notification_type,
    p_title,
    p_message,
    p_related_request_id
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- بيانات قاعدة معرفة أولية
INSERT INTO b2f_ai_knowledge_base (category, question, answer, keywords, priority) VALUES
('faq', 'كيف أحجز أشجار؟', 'لحجز أشجار، اذهب إلى صفحة "الفرص الاستثمارية"، اختر الفرصة المناسبة، اضغط "احجز الآن"، واتبع الخطوات لإتمام الحجز والدفع.', ARRAY['حجز', 'أشجار', 'كيف'], 10),
('faq', 'ما هي حالات الطلب؟', 'حالات الطلب: قيد الانتظار (تم الإرسال)، معتمد (تم الموافقة)، معتمد ينتظر الدفع (ارفع الإيصال)، قيد التحقق (مراجعة الإيصال)، مدفوع (تم التأكيد)، قيد التشغيل (بدأ الموسم).', ARRAY['حالة', 'طلب', 'وضع'], 10),
('faq', 'كيف أرفع إيصال الدفع؟', 'بعد اعتماد طلبك، اذهب إلى طلباتي، اضغط على طلبك، ثم اضغط رفع إيصال الدفع وارفع صورة الإيصال البنكي.', ARRAY['إيصال', 'دفع', 'رفع'], 9),
('faq', 'متى أستلم العقد؟', 'العقد يصدر تلقائياً بعد تأكيد الدفع من الإدارة. يمكنك رؤيته في قسم عقودي.', ARRAY['عقد', 'استلام'], 8),
('faq', 'كيف أستفيد من المحصول؟', 'عند نضج المحصول، ستظهر لك خيارات: استلام للمنزل، إهداء، صدقة، أو البيع بحدود. اختر ما يناسبك.', ARRAY['محصول', 'استفادة', 'حصاد'], 7),
('term', 'ما معنى قيد التشغيل؟', 'قيد التشغيل تعني أن استثمارك دخل مرحلة العناية والتشغيل الفعلي، وبدأ موسم الإنتاج.', ARRAY['تشغيل', 'موسم'], 6),
('term', 'ما معنى قيد التحقق؟', 'قيد التحقق تعني أن إيصال الدفع الذي رفعته يُراجع حالياً من الإدارة أو بالذكاء الاصطناعي.', ARRAY['تحقق', 'مراجعة'], 6),
('guidance', 'أين أجد حجوزاتي؟', 'اذهب إلى قسم طلباتي في القائمة الجانبية، ستجد جميع حجوزاتك وحالاتها.', ARRAY['حجوزات', 'طلبات'], 5),
('guidance', 'أين أجد عقودي؟', 'في القائمة الجانبية، اضغط على عقودي لرؤية جميع العقود والملفات المتعلقة باستثماراتك.', ARRAY['عقود', 'ملفات'], 5),
('guidance', 'كيف أتابع موسم أشجاري؟', 'اذهب إلى التشغيل والمتابعة لرؤية تفاصيل الموسم، المراحل، الصور، والتحديثات.', ARRAY['موسم', 'متابعة', 'تشغيل'], 5);
