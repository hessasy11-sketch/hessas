/*
  # حذف نظام استثمار المزارع

  ## السبب
  تضارب في المعلومات والأفكار بين نظامين في قسم واحد:
  - فرص استئجار الأشجار (يبقى)
  - فرص استثمار المزارع (يُحذف)

  ## ماذا سنحذف
  1. الجداول:
     - farm_investment_returns (عوائد الاستثمارات)
     - farm_investments (الاستثمارات)
     - farm_projects (مشاريع المزارع)
     - farm_investment_types (أنواع الاستثمار)

  2. الأنواع (ENUMs):
     - farm_project_status
     - farm_investment_status
     - farm_payment_status

  3. الوظائف والتريجرز:
     - update_farm_project_shares()
     - trigger_update_farm_project_shares
     - جميع triggers الخاصة بالجداول

  4. الفهارس (Indexes):
     - جميع الفهارس المرتبطة بالجداول

  ## النتيجة
  سيبقى فقط نظام "استئجار الأشجار" في القسم
*/

-- حذف Triggers أولاً
DROP TRIGGER IF EXISTS trigger_update_farm_project_shares ON farm_investments;
DROP TRIGGER IF EXISTS update_farm_investment_types_updated_at ON farm_investment_types;
DROP TRIGGER IF EXISTS update_farm_projects_updated_at ON farm_projects;
DROP TRIGGER IF EXISTS update_farm_investments_updated_at ON farm_investments;

-- حذف الوظائف
DROP FUNCTION IF EXISTS update_farm_project_shares();

-- حذف الجداول (بالترتيب العكسي للعلاقات)
DROP TABLE IF EXISTS farm_investment_returns CASCADE;
DROP TABLE IF EXISTS farm_investments CASCADE;
DROP TABLE IF EXISTS farm_projects CASCADE;
DROP TABLE IF EXISTS farm_investment_types CASCADE;

-- حذف الأنواع (ENUMs)
DROP TYPE IF EXISTS farm_project_status;
DROP TYPE IF EXISTS farm_investment_status;
DROP TYPE IF EXISTS farm_payment_status;
