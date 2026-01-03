/*
  # إنشاء نظام الإشعارات والتنبيهات الذكية

  1. جداول جديدة
    - `notifications` - الإشعارات الرئيسية
    - `notification_preferences` - إعدادات المستخدم للإشعارات
    - `notification_stats` - إحصائيات التفاعل للذكاء المحدود

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات للقراءة والتحديث

  3. الميزات الذكية
    - تصنيف حسب النوع (مالية، مزادات، تفاعل، نظام)
    - أولويات (عادي، مهم، عاجل)
    - روابط مباشرة للأحداث
    - إحصائيات للتعلم الذاتي

  4. الملاحظات
    - يدعم الإشعارات الفورية Realtime
    - جاهز للتكامل مع واتساب
    - الذكاء المحدود يتعلم من السلوك
*/

-- جدول الإشعارات الرئيسي
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('financial', 'auction', 'interaction', 'ai_assistant', 'system')),
  priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  title text NOT NULL,
  message text NOT NULL,
  icon text DEFAULT '🔔',
  link text,
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  sent_via_whatsapp boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- جدول إعدادات الإشعارات للمستخدمين
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled_types jsonb DEFAULT '{"financial": true, "auction": true, "interaction": true, "ai_assistant": true, "system": true}',
  whatsapp_enabled boolean DEFAULT true,
  whatsapp_for_important_only boolean DEFAULT true,
  silent_mode boolean DEFAULT false,
  silent_mode_until timestamptz,
  preferred_time_start time DEFAULT '08:00',
  preferred_time_end time DEFAULT '22:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول إحصائيات التفاعل (للذكاء المحدود)
CREATE TABLE IF NOT EXISTS notification_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  total_sent integer DEFAULT 0,
  total_opened integer DEFAULT 0,
  total_ignored integer DEFAULT 0,
  avg_open_time_seconds integer DEFAULT 0,
  last_interaction_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- تفعيل RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_stats ENABLE ROW LEVEL SECURITY;

-- سياسات الإشعارات
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- سياسات الإعدادات
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- سياسات الإحصائيات
CREATE POLICY "Users can view own stats"
  ON notification_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_stats_user_id ON notification_stats(user_id);

-- دالة لإنشاء إعدادات افتراضية عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لإنشاء الإعدادات تلقائياً
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- دالة لإنشاء إشعار جديد
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_icon text DEFAULT '🔔',
  p_link text DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  new_notification_id uuid;
  user_prefs record;
BEGIN
  -- التحقق من إعدادات المستخدم
  SELECT * INTO user_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- إذا كان الوضع الصامت مفعل، نتجاهل الإشعارات غير العاجلة
  IF user_prefs.silent_mode = true 
     AND user_prefs.silent_mode_until > now() 
     AND p_priority != 'urgent' THEN
    RETURN NULL;
  END IF;
  
  -- التحقق من نوع الإشعار المفعل
  IF NOT (user_prefs.enabled_types->>p_type)::boolean THEN
    RETURN NULL;
  END IF;
  
  -- إنشاء الإشعار
  INSERT INTO notifications (
    user_id,
    type,
    priority,
    title,
    message,
    icon,
    link,
    metadata
  ) VALUES (
    p_user_id,
    p_type,
    p_priority,
    p_title,
    p_message,
    p_icon,
    p_link,
    p_metadata
  )
  RETURNING id INTO new_notification_id;
  
  -- تحديث الإحصائيات
  INSERT INTO notification_stats (user_id, notification_type, total_sent)
  VALUES (p_user_id, p_type, 1)
  ON CONFLICT (user_id, notification_type)
  DO UPDATE SET 
    total_sent = notification_stats.total_sent + 1,
    updated_at = now();
  
  RETURN new_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتمييز الإشعار كمقروء
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id uuid,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  notif_type text;
  time_diff integer;
BEGIN
  -- الحصول على نوع الإشعار وحساب الوقت
  SELECT 
    type,
    EXTRACT(EPOCH FROM (now() - created_at))::integer
  INTO notif_type, time_diff
  FROM notifications
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- تحديث الإشعار
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  -- تحديث الإحصائيات
  UPDATE notification_stats
  SET 
    total_opened = total_opened + 1,
    avg_open_time_seconds = ((avg_open_time_seconds * total_opened) + time_diff) / (total_opened + 1),
    last_interaction_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id AND notification_type = notif_type;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتمييز جميع الإشعارات كمقروءة
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = p_user_id AND is_read = false;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحذف الإشعارات القديمة (أكثر من 30 يوم)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM notifications
  WHERE created_at < (now() - INTERVAL '30 days')
  AND is_read = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- دالة ذكية لتحديد أولوية الإشعار بناءً على سلوك المستخدم
CREATE OR REPLACE FUNCTION get_smart_priority_for_user(
  p_user_id uuid,
  p_type text
)
RETURNS text AS $$
DECLARE
  stats record;
  open_rate numeric;
BEGIN
  SELECT * INTO stats
  FROM notification_stats
  WHERE user_id = p_user_id AND notification_type = p_type;
  
  IF NOT FOUND OR stats.total_sent = 0 THEN
    RETURN 'normal';
  END IF;
  
  -- حساب معدل الفتح
  open_rate := stats.total_opened::numeric / stats.total_sent::numeric;
  
  -- إذا معدل الفتح أقل من 20%، نقلل الأولوية
  IF open_rate < 0.2 THEN
    RETURN 'normal';
  END IF;
  
  -- إذا معدل الفتح أكثر من 70%، نرفع الأولوية
  IF open_rate > 0.7 THEN
    RETURN 'important';
  END IF;
  
  RETURN 'normal';
END;
$$ LANGUAGE plpgsql;

-- تحديث التاريخ تلقائياً
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notification_stats_updated_at
  BEFORE UPDATE ON notification_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- إدراج إشعارات تجريبية للمستخدمين الموجودين
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- الحصول على أول مستخدم للتجربة
  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
  
  IF demo_user_id IS NOT NULL THEN
    -- إنشاء إشعارات تجريبية
    PERFORM create_notification(
      demo_user_id,
      'auction',
      'مبروك! فزت بالمزاد',
      'تهانينا! لقد فزت بمزاد "قمح عضوي ممتاز" بسعر 450 ريال 🎉',
      '🎉',
      '/auction/123',
      'important'
    );
    
    PERFORM create_notification(
      demo_user_id,
      'financial',
      'تم اعتماد إيصالك',
      'تم اعتماد إيصالك البنكي بنجاح - رقم TRX-4521 💳',
      '💳',
      '/wallet',
      'important'
    );
    
    PERFORM create_notification(
      demo_user_id,
      'ai_assistant',
      'رد من المساعد الذكي',
      'تم الرد على استفسارك حول "طريقة نشر المزادات" 🤖',
      '🤖',
      '/help-center',
      'normal'
    );
    
    PERFORM create_notification(
      demo_user_id,
      'interaction',
      'تعليق جديد على مزادك',
      'علّق أحمد على مزادك: "هل التوصيل متاح؟" 💬',
      '💬',
      '/auction/456',
      'normal'
    );
    
    PERFORM create_notification(
      demo_user_id,
      'system',
      'تحديث المنصة',
      'تم إطلاق مركز المساعدة الزراعي الذكي! جربه الآن 🌾',
      '🌾',
      '/help-center',
      'normal'
    );
  END IF;
END $$;

-- تعليقات توضيحية
COMMENT ON TABLE notifications IS 'نظام الإشعارات الذكي للمنصة الزراعية';
COMMENT ON TABLE notification_preferences IS 'إعدادات الإشعارات لكل مستخدم';
COMMENT ON TABLE notification_stats IS 'إحصائيات التفاعل للذكاء المحدود';
COMMENT ON FUNCTION create_notification IS 'دالة إنشاء إشعار ذكي مع فحص الإعدادات';
COMMENT ON FUNCTION mark_notification_read IS 'تمييز إشعار كمقروء مع تحديث الإحصائيات';
COMMENT ON FUNCTION get_smart_priority_for_user IS 'تحديد الأولوية الذكية بناءً على سلوك المستخدم';
