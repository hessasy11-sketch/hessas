/*
  # إنشاء نظام مركز المساعدة الزراعي الذكي

  1. جداول جديدة
    - `faq_database` - قاعدة الأسئلة الشائعة
    - `support_sessions` - جلسات المحادثة مع المساعد
    - `support_messages` - رسائل المحادثة
    - `unanswered_questions` - أسئلة بدون إجابة للتعلم الذاتي
    - `support_tickets` - تذاكر الدعم للمتابعة

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات للقراءة والكتابة

  3. الميزات الذكية
    - تقييم الإجابات (thumbs up/down)
    - تصنيف المواضيع (categories)
    - بحث بالكلمات المفتاحية
    - تتبع الجلسات

  4. الملاحظات
    - النظام جاهز للتكامل مع الذكاء المحدود
    - يدعم التعلم الذاتي
    - قابل للتوسع لاحقاً
*/

-- جدول قاعدة الأسئلة الشائعة
CREATE TABLE IF NOT EXISTS faq_database (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('publishing', 'payment', 'tracking', 'general', 'account')),
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[] DEFAULT '{}',
  icon text DEFAULT '🌿',
  order_index integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول جلسات الدعم
CREATE TABLE IF NOT EXISTS support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text,
  status text CHECK (status IN ('active', 'resolved', 'escalated')) DEFAULT 'active',
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- جدول رسائل الدعم
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES support_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_type text CHECK (sender_type IN ('user', 'ai', 'admin')) NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- جدول الأسئلة بدون إجابة (للتعلم الذاتي)
CREATE TABLE IF NOT EXISTS unanswered_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  context text,
  frequency integer DEFAULT 1,
  status text CHECK (status IN ('pending', 'reviewed', 'added_to_faq')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- جدول تذاكر الدعم للمتابعة
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES support_sessions(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text,
  category text NOT NULL,
  status text CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- تفعيل RLS
ALTER TABLE faq_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE unanswered_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- سياسات قاعدة الأسئلة الشائعة (الكل يقرأ)
CREATE POLICY "Anyone can view active FAQs"
  ON faq_database FOR SELECT
  USING (is_active = true);

-- سياسات جلسات الدعم
CREATE POLICY "Users can view own sessions"
  ON support_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions"
  ON support_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON support_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسات رسائل الدعم
CREATE POLICY "Users can view messages in own sessions"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_sessions
      WHERE support_sessions.id = support_messages.session_id
      AND support_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own sessions"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_sessions
      WHERE support_sessions.id = support_messages.session_id
      AND support_sessions.user_id = auth.uid()
    )
  );

-- سياسات الأسئلة بدون إجابة
CREATE POLICY "Users can view own unanswered questions"
  ON unanswered_questions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create unanswered questions"
  ON unanswered_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسات تذاكر الدعم
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_database(category);
CREATE INDEX IF NOT EXISTS idx_faq_keywords ON faq_database USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_support_sessions_user_id ON support_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON support_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_session_id ON support_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_unanswered_questions_status ON unanswered_questions(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);

-- دالة لتوليد رقم تذكرة فريد
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer := 0;
BEGIN
  LOOP
    new_number := 'TKT-' || LPAD(FLOOR(RANDOM() * 9999 + 1000)::text, 4, '0');
    
    IF NOT EXISTS (SELECT 1 FROM support_tickets WHERE ticket_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    counter := counter + 1;
    IF counter > 10 THEN
      new_number := 'TKT-' || EXTRACT(EPOCH FROM NOW())::bigint;
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- دالة للبحث في قاعدة الأسئلة الشائعة
CREATE OR REPLACE FUNCTION search_faq(search_term text)
RETURNS TABLE (
  id uuid,
  category text,
  question text,
  answer text,
  icon text,
  relevance_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.category,
    f.question,
    f.answer,
    f.icon,
    CASE
      WHEN f.question ILIKE '%' || search_term || '%' THEN 3.0
      WHEN f.answer ILIKE '%' || search_term || '%' THEN 2.0
      WHEN search_term = ANY(f.keywords) THEN 4.0
      ELSE 1.0
    END as relevance_score
  FROM faq_database f
  WHERE 
    f.is_active = true
    AND (
      f.question ILIKE '%' || search_term || '%'
      OR f.answer ILIKE '%' || search_term || '%'
      OR search_term = ANY(f.keywords)
    )
  ORDER BY relevance_score DESC, f.helpful_count DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- تحديث التاريخ تلقائياً
CREATE TRIGGER update_faq_updated_at
  BEFORE UPDATE ON faq_database
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_support_sessions_updated_at
  BEFORE UPDATE ON support_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- إدراج بيانات تجريبية للأسئلة الشائعة
INSERT INTO faq_database (category, question, answer, keywords, icon, order_index) VALUES
  (
    'publishing',
    'كيف أنشر مزاد زراعي جديد؟',
    'لنشر مزاد زراعي جديد: 1) افتح القائمة الجانبية 2) اضغط على زر "+" الأخضر 3) املأ تفاصيل المنتج (الاسم، السعر، الصور) 4) اختر تاريخ انتهاء المزاد 5) اضغط "نشر المزاد" 🌿',
    ARRAY['نشر', 'مزاد', 'إضافة', 'جديد', 'منتج'],
    '🪴',
    1
  ),
  (
    'publishing',
    'ما هي شروط نشر المزادات؟',
    'شروط نشر المزاد: 1) يجب أن يكون المنتج زراعي (محاصيل، معدات، حيوانات مزرعة) 2) صور واضحة وحقيقية 3) سعر ابتدائي عادل 4) وصف دقيق 5) مدة المزاد لا تقل عن 24 ساعة 🌾',
    ARRAY['شروط', 'نشر', 'قواعد', 'مزاد'],
    '📋',
    2
  ),
  (
    'payment',
    'كيف تتم عملية الدفع والعمولات؟',
    'نظام الدفع بسيط: 1) المشتري يدفع المبلغ الكامل 2) المنصة تأخذ عمولة 5% فقط 3) البائع يستلم 95% من المبلغ 4) التحويل يتم خلال 24 ساعة بعد التأكيد 💰',
    ARRAY['دفع', 'عمولة', 'مبلغ', 'تحويل', 'نسبة'],
    '💰',
    1
  ),
  (
    'payment',
    'كيف أسحب أرباحي من المحفظة؟',
    'لسحب أرباحك: 1) افتح "محفظتي الزراعية" 2) اضغط "سحب رصيد" 3) أدخل المبلغ ورقم حسابك البنكي 4) سيصلك المبلغ خلال 1-3 أيام عمل 🏦',
    ARRAY['سحب', 'أرباح', 'محفظة', 'رصيد', 'تحويل'],
    '🏦',
    2
  ),
  (
    'tracking',
    'كيف أتتبع إيصال التحويل البنكي؟',
    'تتبع الإيصال سهل جداً: 1) ارفع صورة الإيصال من "الاشتراكات الذكية" 2) الذكاء المحدود يحللها تلقائياً خلال ثوانٍ 3) ستحصل على رقم تتبع (TRX-XXXX) 4) تابع حالة التحويل من نفس الصفحة 🧾',
    ARRAY['تتبع', 'إيصال', 'تحويل', 'بنكي', 'رقم'],
    '🧾',
    1
  ),
  (
    'tracking',
    'ماذا أفعل إذا رُفض إيصالي؟',
    'إذا رُفض الإيصال: 1) تحقق من وضوح الصورة 2) تأكد من تطابق المبلغ 3) ارفع إيصال جديد أوضح 4) أو تواصل معنا عبر واتساب للمساعدة المباشرة 📞',
    ARRAY['رفض', 'إيصال', 'مشكلة', 'حل'],
    '❌',
    2
  ),
  (
    'account',
    'كيف أغير معلومات حسابي؟',
    'لتغيير معلومات الحساب: 1) افتح القائمة الجانبية 2) اضغط "إعدادات الحساب" 3) عدّل المعلومات المطلوبة 4) احفظ التغييرات ⚙️',
    ARRAY['تغيير', 'حساب', 'معلومات', 'إعدادات'],
    '⚙️',
    1
  ),
  (
    'general',
    'كيف أتواصل مع البائع؟',
    'للتواصل مع البائع: 1) افتح صفحة المزاد 2) اضغط زر "💬 مراسلة البائع" 3) ابدأ المحادثة المباشرة 4) يمكنك إرسال نصوص وصور 📱',
    ARRAY['تواصل', 'بائع', 'محادثة', 'رسالة'],
    '💬',
    1
  )
ON CONFLICT DO NOTHING;

-- تعليقات توضيحية
COMMENT ON TABLE faq_database IS 'قاعدة الأسئلة الشائعة للمساعد الذكي';
COMMENT ON TABLE support_sessions IS 'جلسات المحادثة مع المساعد الزراعي الذكي';
COMMENT ON TABLE support_messages IS 'رسائل المحادثة بين المستخدم والمساعد';
COMMENT ON TABLE unanswered_questions IS 'أسئلة بدون إجابة لتطوير قاعدة المعرفة';
COMMENT ON TABLE support_tickets IS 'تذاكر الدعم الفني للمتابعة';
