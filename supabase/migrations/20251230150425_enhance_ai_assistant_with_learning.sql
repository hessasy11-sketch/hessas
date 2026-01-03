/*
  # تحسين نظام المساعد الذكي مع التعلم من المحادثات

  1. التحسينات
    - إضافة نظام تقييم الإجابات
    - إضافة نظام تعلم من المحادثات
    - إضافة إحصائيات مفصلة
    - تحسين تتبع الأداء
    
  2. الجداول الجديدة
    - `b2f_ai_feedback`: تقييمات المستخدمين للإجابات
    - `b2f_ai_learning_log`: سجل التعلم والتحسينات
    - `b2f_ai_analytics`: تحليلات الأداء
*/

-- جدول تقييمات المستخدمين
CREATE TABLE IF NOT EXISTS b2f_ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES b2f_ai_conversations(id) ON DELETE CASCADE,
  message_id uuid,
  investor_phone text NOT NULL,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  feedback_type text CHECK (feedback_type IN ('helpful', 'not_helpful', 'wrong_info', 'incomplete')),
  feedback_text text,
  created_at timestamptz DEFAULT now()
);

-- جدول سجل التعلم
CREATE TABLE IF NOT EXISTS b2f_ai_learning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_pattern text NOT NULL,
  original_answer text,
  improved_answer text,
  improvement_reason text,
  confidence_score numeric DEFAULT 0,
  usage_count integer DEFAULT 0,
  success_rate numeric DEFAULT 0,
  is_approved boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول التحليلات
CREATE TABLE IF NOT EXISTS b2f_ai_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date DEFAULT CURRENT_DATE,
  total_conversations integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  successful_matches integer DEFAULT 0,
  failed_matches integer DEFAULT 0,
  avg_response_time numeric DEFAULT 0,
  avg_satisfaction_rating numeric DEFAULT 0,
  top_questions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date)
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_ai_feedback_conversation ON b2f_ai_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON b2f_ai_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_ai_learning_approved ON b2f_ai_learning_log(is_approved);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_date ON b2f_ai_analytics(date);

-- إضافة حقول جديدة لجدول المحادثات
ALTER TABLE b2f_ai_conversations 
ADD COLUMN IF NOT EXISTS satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false;

-- إضافة حقول جديدة لجدول الرسائل
ALTER TABLE b2f_ai_messages
ADD COLUMN IF NOT EXISTS response_time_ms integer,
ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS feedback_rating integer CHECK (feedback_rating BETWEEN 1 AND 5);

-- سياسات RLS
ALTER TABLE b2f_ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_ai_learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_ai_analytics ENABLE ROW LEVEL SECURITY;

-- المستخدمون يمكنهم إضافة تقييماتهم
CREATE POLICY "Users can add their feedback"
  ON b2f_ai_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- المستخدمون يمكنهم رؤية تقييماتهم
CREATE POLICY "Users can view their feedback"
  ON b2f_ai_feedback FOR SELECT
  TO anon, authenticated
  USING (true);

-- الإدارة فقط يمكنها إدارة سجل التعلم
CREATE POLICY "Admin can manage learning log"
  ON b2f_ai_learning_log FOR ALL
  TO authenticated
  USING (is_b2f_admin());

-- الجميع يمكنهم رؤية التحليلات المعتمدة
CREATE POLICY "Anyone can view analytics"
  ON b2f_ai_analytics FOR SELECT
  TO anon, authenticated
  USING (true);

-- الإدارة فقط يمكنها إدارة التحليلات
CREATE POLICY "Admin can manage analytics"
  ON b2f_ai_analytics FOR ALL
  TO authenticated
  USING (is_b2f_admin());

-- دالة لحساب معدل النجاح
CREATE OR REPLACE FUNCTION calculate_ai_success_rate()
RETURNS numeric AS $$
DECLARE
  total_messages integer;
  successful_matches integer;
BEGIN
  SELECT COUNT(*) INTO total_messages
  FROM b2f_ai_messages
  WHERE role = 'assistant'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  SELECT COUNT(*) INTO successful_matches
  FROM b2f_ai_messages
  WHERE role = 'assistant'
  AND matched_knowledge_id IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  IF total_messages > 0 THEN
    RETURN (successful_matches::numeric / total_messages::numeric) * 100;
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على الأسئلة الأكثر شيوعاً بدون إجابة
CREATE OR REPLACE FUNCTION get_unanswered_frequent_questions(limit_count integer DEFAULT 10)
RETURNS TABLE (
  question text,
  count integer,
  last_asked timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.content as question,
    COUNT(*)::integer as count,
    MAX(m.created_at) as last_asked
  FROM b2f_ai_messages m
  WHERE m.role = 'user'
  AND NOT EXISTS (
    SELECT 1 FROM b2f_ai_messages m2 
    WHERE m2.conversation_id = m.conversation_id 
    AND m2.role = 'assistant' 
    AND m2.matched_knowledge_id IS NOT NULL
    AND m2.created_at > m.created_at
  )
  GROUP BY m.content
  ORDER BY count DESC, last_asked DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث التحليلات اليومية
CREATE OR REPLACE FUNCTION update_daily_ai_analytics()
RETURNS void AS $$
DECLARE
  today date := CURRENT_DATE;
  conversations_count integer;
  messages_count integer;
  matches_count integer;
  failed_count integer;
  avg_rating numeric;
BEGIN
  -- حساب الإحصائيات
  SELECT COUNT(DISTINCT conversation_id) INTO conversations_count
  FROM b2f_ai_messages
  WHERE created_at::date = today;
  
  SELECT COUNT(*) INTO messages_count
  FROM b2f_ai_messages
  WHERE created_at::date = today AND role = 'user';
  
  SELECT COUNT(*) INTO matches_count
  FROM b2f_ai_messages
  WHERE created_at::date = today 
  AND role = 'assistant' 
  AND matched_knowledge_id IS NOT NULL;
  
  SELECT COUNT(*) INTO failed_count
  FROM b2f_ai_messages
  WHERE created_at::date = today 
  AND role = 'assistant' 
  AND matched_knowledge_id IS NULL;
  
  SELECT AVG(rating) INTO avg_rating
  FROM b2f_ai_feedback
  WHERE created_at::date = today;
  
  -- تحديث أو إدراج
  INSERT INTO b2f_ai_analytics (
    date,
    total_conversations,
    total_messages,
    successful_matches,
    failed_matches,
    avg_satisfaction_rating
  ) VALUES (
    today,
    conversations_count,
    messages_count,
    matches_count,
    failed_count,
    COALESCE(avg_rating, 0)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_conversations = EXCLUDED.total_conversations,
    total_messages = EXCLUDED.total_messages,
    successful_matches = EXCLUDED.successful_matches,
    failed_matches = EXCLUDED.failed_matches,
    avg_satisfaction_rating = EXCLUDED.avg_satisfaction_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
