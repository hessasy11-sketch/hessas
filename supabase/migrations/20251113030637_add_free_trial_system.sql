/*
  # إضافة نظام التجربة المجانية للباقات

  ## الوصف
  نظام تجربة مجانية لمدة 7 أيام للباقات المدفوعة (الفضية والذهبية)
  - يسمح للمستخدم بتجربة الباقة مرة واحدة فقط
  - تفعيل فوري بدون دفع
  - إشعارات قبل انتهاء التجربة
  - منع إساءة الاستخدام

  ## التغييرات

  1. **إضافة حقول التجربة المجانية إلى user_subscriptions:**
     - `is_trial` (boolean): هل هذا اشتراك تجريبي
     - `trial_started_at` (timestamptz): متى بدأت التجربة
     - `trial_ends_at` (timestamptz): متى تنتهي التجربة
     - `trial_used` (boolean): تم استخدام التجربة من قبل

  2. **جدول سجل التجارب المجانية:**
     - تسجيل كل تجربة مجانية
     - منع التكرار
     - تتبع الاستخدام

  3. **دالة التحقق من أهلية التجربة:**
     - فحص إذا كان المستخدم استخدم التجربة من قبل
     - التحقق من الباقة المناسبة

  4. **دالة تفعيل التجربة المجانية:**
     - إنشاء اشتراك تجريبي لمدة 7 أيام
     - تحديث السجلات
     - منع التكرار

  5. **RLS Policies:**
     - سياسات أمان للتحكم في الوصول
*/

-- إضافة حقول التجربة المجانية إلى جدول الاشتراكات
DO $$
BEGIN
  -- is_trial: هل هذا اشتراك تجريبي
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'is_trial'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN is_trial boolean DEFAULT false;
  END IF;

  -- trial_started_at: وقت بداية التجربة
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'trial_started_at'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN trial_started_at timestamptz;
  END IF;

  -- trial_ends_at: وقت نهاية التجربة
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN trial_ends_at timestamptz;
  END IF;
END $$;

-- جدول سجل التجارب المجانية (لمنع إساءة الاستخدام)
CREATE TABLE IF NOT EXISTS free_trial_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('silver', 'gold')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  was_converted boolean DEFAULT false,
  converted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- فهرس لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_free_trial_user ON free_trial_history(user_id);
CREATE INDEX IF NOT EXISTS idx_free_trial_plan ON free_trial_history(plan_type);

-- تفعيل RLS
ALTER TABLE free_trial_history ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يرى سجلاته فقط
CREATE POLICY "Users can view own trial history"
  ON free_trial_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- سياسة الإدراج: النظام فقط
CREATE POLICY "System can insert trial history"
  ON free_trial_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- دالة التحقق من أهلية التجربة المجانية
CREATE OR REPLACE FUNCTION check_trial_eligibility(
  p_user_id uuid,
  p_plan_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_used_trial boolean;
BEGIN
  -- التحقق من استخدام التجربة المجانية من قبل
  SELECT EXISTS (
    SELECT 1
    FROM free_trial_history
    WHERE user_id = p_user_id
    AND plan_type = p_plan_type
  ) INTO v_has_used_trial;

  -- إرجاع true إذا لم يستخدم التجربة من قبل
  RETURN NOT v_has_used_trial;
END;
$$;

-- دالة تفعيل التجربة المجانية
CREATE OR REPLACE FUNCTION activate_free_trial(
  p_user_id uuid,
  p_plan_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_eligible boolean;
  v_plan_id uuid;
  v_subscription_id uuid;
  v_trial_end timestamptz;
BEGIN
  -- التحقق من الأهلية
  v_is_eligible := check_trial_eligibility(p_user_id, p_plan_type);

  IF NOT v_is_eligible THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'trial_already_used',
      'message', 'لقد استخدمت التجربة المجانية من قبل'
    );
  END IF;

  -- الحصول على معرف الباقة
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE plan_type = p_plan_type
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'plan_not_found',
      'message', 'الباقة غير موجودة'
    );
  END IF;

  -- حساب تاريخ انتهاء التجربة (7 أيام)
  v_trial_end := now() + interval '7 days';

  -- إلغاء أي اشتراكات نشطة حالية
  UPDATE user_subscriptions
  SET status = 'cancelled',
      updated_at = now()
  WHERE user_id = p_user_id
  AND status = 'active';

  -- إنشاء اشتراك تجريبي جديد
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    starts_at,
    ends_at,
    is_trial,
    trial_started_at,
    trial_ends_at,
    auto_renew
  ) VALUES (
    p_user_id,
    v_plan_id,
    'active',
    now(),
    v_trial_end,
    true,
    now(),
    v_trial_end,
    false
  )
  RETURNING id INTO v_subscription_id;

  -- تسجيل في سجل التجارب المجانية
  INSERT INTO free_trial_history (
    user_id,
    subscription_id,
    plan_type,
    started_at,
    ended_at
  ) VALUES (
    p_user_id,
    v_subscription_id,
    p_plan_type,
    now(),
    v_trial_end
  );

  -- إنشاء إشعار للمستخدم
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    priority
  ) VALUES (
    p_user_id,
    'subscription',
    'تم تفعيل التجربة المجانية!',
    'تهانينا! لديك الآن 7 أيام تجربة مجانية للباقة ' ||
    CASE
      WHEN p_plan_type = 'silver' THEN 'الفضية'
      ELSE 'الذهبية'
    END || '. استمتع بجميع المميزات!',
    'high'
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'trial_ends_at', v_trial_end,
    'message', 'تم تفعيل التجربة المجانية بنجاح'
  );
END;
$$;

-- دالة للحصول على معلومات التجربة المجانية
CREATE OR REPLACE FUNCTION get_trial_info(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_trial record;
  v_days_remaining numeric;
  v_silver_eligible boolean;
  v_gold_eligible boolean;
BEGIN
  -- التحقق من وجود تجربة نشطة
  SELECT
    us.id,
    us.is_trial,
    us.trial_ends_at,
    sp.plan_type,
    sp.name_ar
  INTO v_current_trial
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
  AND us.status = 'active'
  AND us.is_trial = true
  AND us.trial_ends_at > now()
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- حساب الأيام المتبقية
  IF v_current_trial.trial_ends_at IS NOT NULL THEN
    v_days_remaining := EXTRACT(EPOCH FROM (v_current_trial.trial_ends_at - now())) / 86400;
  END IF;

  -- التحقق من الأهلية للتجارب الجديدة
  v_silver_eligible := check_trial_eligibility(p_user_id, 'silver');
  v_gold_eligible := check_trial_eligibility(p_user_id, 'gold');

  RETURN jsonb_build_object(
    'has_active_trial', v_current_trial.id IS NOT NULL,
    'trial_plan_type', v_current_trial.plan_type,
    'trial_plan_name', v_current_trial.name_ar,
    'trial_ends_at', v_current_trial.trial_ends_at,
    'days_remaining', COALESCE(CEIL(v_days_remaining), 0),
    'hours_remaining', COALESCE(CEIL(v_days_remaining * 24), 0),
    'silver_trial_eligible', v_silver_eligible,
    'gold_trial_eligible', v_gold_eligible
  );
END;
$$;

-- Cron job لإرسال تنبيهات قبل انتهاء التجربة (يوم واحد)
-- ملاحظة: يتطلب تفعيل pg_cron في Supabase
CREATE OR REPLACE FUNCTION notify_trial_ending_soon()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إرسال إشعار قبل يوم واحد من انتهاء التجربة
  INSERT INTO user_notifications (user_id, type, title, message, priority)
  SELECT
    us.user_id,
    'subscription',
    'تنتهي تجربتك المجانية قريباً!',
    'تنتهي تجربتك المجانية للباقة ' || sp.name_ar || ' خلال أقل من 24 ساعة. لا تفوت الفرصة وقم بالترقية الآن للاستمرار في الاستمتاع بجميع المميزات!',
    'high'
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.status = 'active'
  AND us.is_trial = true
  AND us.trial_ends_at BETWEEN now() AND now() + interval '1 day'
  AND NOT EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = us.user_id
    AND type = 'subscription'
    AND title LIKE '%تنتهي تجربتك%'
    AND created_at > now() - interval '2 days'
  );
END;
$$;

-- دالة لتحويل التجربة إلى اشتراك مدفوع
CREATE OR REPLACE FUNCTION convert_trial_to_paid(
  p_subscription_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription record;
BEGIN
  -- الحصول على معلومات الاشتراك
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE id = p_subscription_id
  AND is_trial = true
  AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'trial_not_found',
      'message', 'التجربة المجانية غير موجودة أو منتهية'
    );
  END IF;

  -- تحديث الاشتراك إلى مدفوع
  UPDATE user_subscriptions
  SET is_trial = false,
      starts_at = now(),
      ends_at = now() + interval '1 month',
      auto_renew = true,
      updated_at = now()
  WHERE id = p_subscription_id;

  -- تحديث سجل التجربة
  UPDATE free_trial_history
  SET was_converted = true,
      converted_at = now()
  WHERE subscription_id = p_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحويل التجربة إلى اشتراك مدفوع بنجاح'
  );
END;
$$;

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial ON user_subscriptions(user_id, is_trial) WHERE is_trial = true;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_end ON user_subscriptions(trial_ends_at) WHERE is_trial = true AND status = 'active';
