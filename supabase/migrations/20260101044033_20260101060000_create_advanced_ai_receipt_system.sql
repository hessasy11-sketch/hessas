/*
  # نظام الذكاء الصناعي المتقدم لفحص الإيصالات

  1. جداول جديدة:
    - `ai_receipt_patterns` - أنماط الإيصالات المعروفة
    - `ai_fraud_indicators` - مؤشرات التزوير
    - `ai_learning_history` - تاريخ التعلم من القرارات
    - `ai_image_quality_metrics` - مقاييس جودة الصور

  2. ميزات متقدمة:
    - كشف التزوير والتلاعب
    - التعرف على أنماط البنوك
    - تحليل جودة الصورة
    - التعلم من القرارات السابقة
    - تحليل سياقي متعدد الطبقات
*/

-- 1. جدول أنماط الإيصالات المعروفة
CREATE TABLE IF NOT EXISTS ai_receipt_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  logo_signature TEXT,
  color_scheme JSONB,
  typical_elements JSONB,
  confidence_weight INTEGER DEFAULT 100,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  total_samples INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول مؤشرات التزوير
CREATE TABLE IF NOT EXISTS ai_fraud_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_type TEXT NOT NULL,
  description TEXT,
  severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  detection_method TEXT,
  weight_score INTEGER DEFAULT 50,
  false_positive_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول تاريخ التعلم من القرارات
CREATE TABLE IF NOT EXISTS ai_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_url TEXT NOT NULL,
  original_decision TEXT NOT NULL,
  human_override TEXT,
  ai_confidence DECIMAL(5,2),
  was_correct BOOLEAN,
  correction_reason TEXT,
  detected_patterns JSONB,
  learning_points JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول مقاييس جودة الصور
CREATE TABLE IF NOT EXISTS ai_image_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  receipt_url TEXT NOT NULL,
  image_resolution TEXT,
  clarity_score DECIMAL(5,2),
  brightness_level TEXT,
  contrast_quality TEXT,
  text_readability DECIMAL(5,2),
  blur_detected BOOLEAN DEFAULT false,
  rotation_needed BOOLEAN DEFAULT false,
  noise_level TEXT,
  overall_quality TEXT CHECK (overall_quality IN ('excellent', 'good', 'fair', 'poor')),
  quality_issues JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول سجل التحقق المتقدم (يحل محل الجدول القديم)
CREATE TABLE IF NOT EXISTS ai_advanced_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES b2f_sales_requests(id) ON DELETE CASCADE,
  receipt_url TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  fraud_score DECIMAL(5,2) DEFAULT 0.00,
  fraud_indicators JSONB,
  pattern_match_score DECIMAL(5,2),
  matched_bank_pattern TEXT,
  image_quality_score DECIMAL(5,2),
  duplicate_check_result BOOLEAN,
  timestamp_verification TEXT,
  metadata_analysis JSONB,
  advanced_features JSONB,
  is_valid_receipt BOOLEAN,
  detected_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  amount_difference DECIMAL(10,2),
  detected_date TEXT,
  detected_bank TEXT,
  detected_beneficiary TEXT,
  has_transaction_id BOOLEAN,
  has_bank_logo BOOLEAN,
  has_official_stamp BOOLEAN,
  rejection_reason TEXT,
  ai_notes TEXT,
  manual_review_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. إضافة حقول متقدمة لجدول الطلبات
ALTER TABLE b2f_sales_requests
ADD COLUMN IF NOT EXISTS ai_fraud_score DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ai_fraud_indicators JSONB,
ADD COLUMN IF NOT EXISTS ai_pattern_confidence DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ai_image_quality TEXT,
ADD COLUMN IF NOT EXISTS ai_duplicate_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_learning_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_advanced_analysis JSONB;

-- 7. فهرسة للأداء
CREATE INDEX IF NOT EXISTS idx_patterns_bank ON ai_receipt_patterns(bank_name);
CREATE INDEX IF NOT EXISTS idx_fraud_severity ON ai_fraud_indicators(severity_level);
CREATE INDEX IF NOT EXISTS idx_learning_decision ON ai_learning_history(original_decision);
CREATE INDEX IF NOT EXISTS idx_image_quality ON ai_image_quality_metrics(overall_quality);
CREATE INDEX IF NOT EXISTS idx_advanced_logs_request ON ai_advanced_verification_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_advanced_logs_status ON ai_advanced_verification_logs(verification_status);

-- 8. بيانات أنماط البنوك السعودية الرئيسية
INSERT INTO ai_receipt_patterns (bank_name, pattern_name, typical_elements, confidence_weight) VALUES
('البنك الأهلي السعودي', 'NCB Standard Receipt',
  '{"header_style": "bold_green", "logo_position": "top_left", "transaction_id_format": "NCB[0-9]{12}", "typical_fonts": ["Arial", "Helvetica"], "watermark": true}'::JSONB,
  100),
('بنك الراجحي', 'Al Rajhi Transfer Receipt',
  '{"header_style": "gold_gradient", "logo_position": "centered", "transaction_id_format": "RAJ[0-9]{10}", "islamic_elements": true, "green_theme": true}'::JSONB,
  100),
('بنك الرياض', 'Riyad Bank Digital Receipt',
  '{"header_style": "blue_professional", "logo_position": "top_center", "transaction_id_format": "RB[0-9]{14}", "qr_code_present": true, "modern_design": true}'::JSONB,
  95),
('مصرف الإنماء', 'Alinma Transfer Confirmation',
  '{"header_style": "teal_modern", "logo_position": "top_left", "transaction_id_format": "ALM[0-9]{11}", "islamic_design": true, "clean_layout": true}'::JSONB,
  90),
('البنك السعودي للاستثمار', 'SAIB Payment Receipt',
  '{"header_style": "blue_elegant", "logo_position": "top_left", "transaction_id_format": "SAIB[0-9]{10}", "professional_layout": true}'::JSONB,
  85),
('البنك السعودي الفرنسي', 'Banque Saudi Fransi Receipt',
  '{"header_style": "red_blue", "logo_position": "top_left", "transaction_id_format": "BSF[0-9]{12}", "dual_language": true}'::JSONB,
  85),
('البنك العربي الوطني', 'Arab National Bank Receipt',
  '{"header_style": "orange_modern", "logo_position": "top_center", "transaction_id_format": "ANB[0-9]{11}", "digital_signature": true}'::JSONB,
  80);

-- 9. مؤشرات التزوير الشائعة
INSERT INTO ai_fraud_indicators (indicator_type, description, severity_level, weight_score) VALUES
('duplicate_transaction', 'نفس رقم العملية مستخدم في إيصال سابق', 'critical', 100),
('edited_image', 'علامات تعديل رقمي على الصورة (تغيير ألوان، محو نص)', 'high', 90),
('fake_stamp', 'ختم غير حقيقي أو مضاف رقمياً بشكل واضح', 'high', 85),
('template_reuse', 'استخدام قالب إيصال مكرر من الإنترنت', 'high', 80),
('amount_mismatch', 'تناقض بين الأرقام والحروف في قيمة المبلغ', 'medium', 70),
('timestamp_anomaly', 'تاريخ غير منطقي أو مستقبلي أو قديم جداً', 'medium', 65),
('inconsistent_fonts', 'اختلاف في الخطوط يدل على تعديل', 'medium', 60),
('missing_metadata', 'بيانات EXIF مفقودة أو معدلة', 'medium', 55),
('poor_quality', 'جودة صورة متدنية بشكل مشبوه لإخفاء التفاصيل', 'low', 40),
('missing_watermark', 'علامة مائية مفقودة في بنك معروف بوضعها', 'low', 35),
('unusual_format', 'تنسيق غير معتاد للإيصال من هذا البنك', 'low', 30);

-- 10. RLS Policies
ALTER TABLE ai_receipt_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fraud_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_advanced_verification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view patterns" ON ai_receipt_patterns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage patterns" ON ai_receipt_patterns FOR ALL TO authenticated USING (true);

CREATE POLICY "Admin can view fraud indicators" ON ai_fraud_indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage fraud indicators" ON ai_fraud_indicators FOR ALL TO authenticated USING (true);

CREATE POLICY "Admin can view learning history" ON ai_learning_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage learning history" ON ai_learning_history FOR ALL TO authenticated USING (true);

CREATE POLICY "Anyone can view image quality" ON ai_image_quality_metrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "System can insert image quality" ON ai_image_quality_metrics FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view advanced logs" ON ai_advanced_verification_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "System can insert advanced logs" ON ai_advanced_verification_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin can manage advanced logs" ON ai_advanced_verification_logs FOR ALL TO authenticated USING (true);

COMMENT ON TABLE ai_receipt_patterns IS 'أنماط الإيصالات المعروفة من البنوك السعودية - يستخدمها الذكاء الصناعي للتعرف على الإيصالات الحقيقية';
COMMENT ON TABLE ai_fraud_indicators IS 'مؤشرات التزوير والتلاعب في الإيصالات - نظام كشف متعدد الطبقات';
COMMENT ON TABLE ai_learning_history IS 'تاريخ التعلم من قرارات الموظفين البشرية - يحسن دقة الذكاء الصناعي';
COMMENT ON TABLE ai_image_quality_metrics IS 'مقاييس جودة صور الإيصالات - تقييم شامل للوضوح والقابلية للقراءة';
COMMENT ON TABLE ai_advanced_verification_logs IS 'سجل التحقق المتقدم بميزات الذكاء الصناعي الكاملة';
