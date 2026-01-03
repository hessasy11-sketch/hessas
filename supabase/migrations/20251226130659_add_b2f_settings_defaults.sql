/*
  # إضافة الإعدادات الافتراضية لقسم استثمار الأشجار

  ## نظرة عامة
  إضافة جميع الإعدادات المطلوبة لإدارة قسم استثمار الأشجار
  
  ## الإعدادات المضافة
  
  ### (أ) إعدادات العقد الأساسية
  - مدة العقد الافتراضية
  - نص توضيح المبلغ
  - نص موافقة العقد
  
  ### (ب) إعدادات السليدر
  - عناوين فئات الأشجار
  - نص التعريف بالقسم
  
  ### (ج) الحدود الافتراضية
  - أقل عدد أشجار
  - أقصى عدد أشجار
  - الحد الأدنى للاستثمار
  
  ### (د) نصوص واجهة المستثمر
  - نص نجاح الطلب
  - نص تفعيل العقد
  - نص رفع الإيصال
*/

-- حذف الإعدادات القديمة (إن وجدت)
DELETE FROM b2f_settings WHERE setting_key IN (
  'system_name',
  'welcome_message',
  'contact_email',
  'contact_phone',
  'min_investment_trees',
  'max_investment_trees'
);

-- ===============================================
-- (أ) إعدادات العقد الأساسية
-- ===============================================

INSERT INTO b2f_settings (setting_key, setting_value, setting_type, description) VALUES
  (
    'contract_default_duration_years',
    '10',
    'number',
    'مدة العقد الافتراضية بالسنوات'
  ),
  (
    'contract_amount_explanation_text',
    'المبلغ الموضح يمثل قيمة الاستثمار لمدة 10 سنوات كاملة، وليس مبلغاً سنوياً.',
    'text',
    'نص توضيح أن المبلغ يشمل كامل مدة العقد'
  ),
  (
    'contract_agreement_checkbox_text',
    'أقر أنني اطلعت على بنود العقد وفهمت أن قيمة الاستثمار تشمل كامل مدة العقد.',
    'text',
    'نص الموافقة الذي يظهر بجانب checkbox العقد'
  )
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description,
  updated_at = now();

-- ===============================================
-- (ب) إعدادات واجهة السليدر والفلترة
-- ===============================================

INSERT INTO b2f_settings (setting_key, setting_value, setting_type, description) VALUES
  (
    'slider_categories',
    '["تعريف الاستثمار","الكل","نخيل","زيتون","مانجو","موز","أخرى"]',
    'json',
    'قائمة فئات الأشجار في السليدر (يمكن إضافة وحذف وترتيب)'
  ),
  (
    'section_intro_text',
    'هنا يمكنك استئجار أشجار مثمرة لمدة استثمارية محددة، تحت إدارة المنصة.',
    'text',
    'نص التعريف بالقسم يظهر عند الضغط على أيقونة التعريف'
  )
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description,
  updated_at = now();

-- ===============================================
-- (ج) إعدادات الحدود الافتراضية
-- ===============================================

INSERT INTO b2f_settings (setting_key, setting_value, setting_type, description) VALUES
  (
    'min_trees_per_request',
    '5',
    'number',
    'أقل عدد أشجار يمكن طلبها في عرض واحد'
  ),
  (
    'max_trees_per_request',
    '1000',
    'number',
    'أقصى عدد أشجار يمكن طلبها في عرض واحد (اختياري)'
  ),
  (
    'min_investment_amount',
    '5000',
    'number',
    'الحد الأدنى لقيمة الاستثمار بالريال (اختياري)'
  )
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description,
  updated_at = now();

-- ===============================================
-- (د) إعدادات نصوص واجهة المستثمر
-- ===============================================

INSERT INTO b2f_settings (setting_key, setting_value, setting_type, description) VALUES
  (
    'success_request_submitted_text',
    'تم استلام طلبك الاستثماري، وسيتم التواصل معك قريباً.',
    'text',
    'نص يظهر للمستثمر عند نجاح طلب استثمار مبدئي'
  ),
  (
    'success_contract_created_text',
    'تم تفعيل عقد استثمارك، وستظهر تفاصيله في حسابك.',
    'text',
    'نص يظهر عند نجاح إنشاء عقد بعد الدفع'
  ),
  (
    'success_receipt_uploaded_text',
    'تم استلام الإيصال، وسيتم مراجعته من قبل فريق المالية.',
    'text',
    'نص يظهر عند رفع إيصال الدفع'
  )
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description,
  updated_at = now();

-- ===============================================
-- إعدادات إضافية عامة
-- ===============================================

INSERT INTO b2f_settings (setting_key, setting_value, setting_type, description) VALUES
  (
    'system_name',
    'نظام استثمار أشجار المزارع',
    'text',
    'اسم النظام'
  ),
  (
    'contact_email',
    'invest@farms.sa',
    'text',
    'البريد الإلكتروني للتواصل'
  ),
  (
    'contact_phone',
    '0500000000',
    'text',
    'رقم الهاتف للتواصل'
  )
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description,
  updated_at = now();
