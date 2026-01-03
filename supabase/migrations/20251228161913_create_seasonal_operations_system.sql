/*
  # نظام التشغيل الموسمي الذكي للمزارع
  
  1. الجداول الجديدة
  
    أ. b2f_farm_seasons - مواسم التشغيل
      - id: UUID
      - farm_id: UUID (foreign key → b2f_farms)
      - contract_id: UUID (foreign key → b2f_contracts)
      - request_id: UUID (foreign key → b2f_investment_requests)
      - season_number: INTEGER (رقم الموسم للمزرعة)
      - season_year: INTEGER (السنة الميلادية)
      - status: TEXT (season_activated, growth_phase, scheduled_irrigation, ...)
      - start_date: TIMESTAMPTZ
      - expected_end_date: TIMESTAMPTZ
      - actual_end_date: TIMESTAMPTZ
      - progress_percentage: INTEGER (0-100)
      - current_phase: TEXT
      - is_active: BOOLEAN
      - season_notes: TEXT
      - total_costs: DECIMAL
      - total_harvest: DECIMAL
      - created_at: TIMESTAMPTZ
      - updated_at: TIMESTAMPTZ
    
    ب. b2f_season_phases - مراحل الموسم
      - id: UUID
      - season_id: UUID (foreign key → b2f_farm_seasons)
      - phase_order: INTEGER (1-10)
      - phase_type: TEXT (تفعيل_التشغيل, مرحلة_النمو, ...)
      - phase_status: TEXT (pending, in_progress, completed, skipped)
      - started_at: TIMESTAMPTZ
      - completed_at: TIMESTAMPTZ
      - phase_notes: TEXT
      - phase_data: JSONB (بيانات إضافية حسب نوع المرحلة)
      - created_at: TIMESTAMPTZ
      - updated_at: TIMESTAMPTZ
    
    ج. b2f_phase_tasks - مهام كل مرحلة
      - id: UUID
      - phase_id: UUID (foreign key → b2f_season_phases)
      - task_title: TEXT
      - task_description: TEXT
      - task_type: TEXT (irrigation, fertilization, pruning, pest_control, ...)
      - task_status: TEXT (pending, in_progress, completed)
      - assigned_to: TEXT
      - due_date: TIMESTAMPTZ
      - completed_at: TIMESTAMPTZ
      - task_cost: DECIMAL
      - task_notes: TEXT
      - created_at: TIMESTAMPTZ
      - updated_at: TIMESTAMPTZ
    
    د. b2f_season_files - ملفات الموسم
      - id: UUID
      - season_id: UUID (foreign key → b2f_farm_seasons)
      - phase_id: UUID (foreign key → b2f_season_phases)
      - task_id: UUID (foreign key → b2f_phase_tasks)
      - file_type: TEXT (image, video, document, report)
      - file_url: TEXT
      - file_name: TEXT
      - description: TEXT
      - uploaded_by: TEXT
      - created_at: TIMESTAMPTZ
    
    هـ. b2f_season_costs - تفاصيل تكاليف الموسم
      - id: UUID
      - season_id: UUID (foreign key → b2f_farm_seasons)
      - phase_id: UUID (foreign key → b2f_season_phases)
      - cost_type: TEXT (water, fertilizer, labor, transport, processing, ...)
      - cost_amount: DECIMAL
      - cost_description: TEXT
      - cost_date: TIMESTAMPTZ
      - receipt_url: TEXT
      - created_at: TIMESTAMPTZ
    
    و. b2f_harvest_records - سجلات الحصاد
      - id: UUID
      - season_id: UUID (foreign key → b2f_farm_seasons)
      - harvest_date: TIMESTAMPTZ
      - quantity_kg: DECIMAL
      - quality_grade: TEXT (ممتاز, جيد, متوسط)
      - harvest_notes: TEXT
      - created_at: TIMESTAMPTZ
    
    ز. b2f_season_reports - تقارير نهاية الموسم
      - id: UUID
      - season_id: UUID (foreign key → b2f_farm_seasons)
      - report_type: TEXT (final_report, interim_report)
      - report_data: JSONB
      - report_pdf_url: TEXT
      - generated_at: TIMESTAMPTZ
      - generated_by: TEXT
  
  2. Security
    - تفعيل RLS على جميع الجداول
    - سياسات للمستثمرين (قراءة فقط)
    - سياسات للإدارة (قراءة وكتابة)
*/

-- جدول مواسم التشغيل
CREATE TABLE IF NOT EXISTS b2f_farm_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES b2f_farms(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES b2f_contracts(id),
  request_id UUID REFERENCES b2f_investment_requests(id),
  season_number INTEGER NOT NULL DEFAULT 1,
  season_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'season_activated' CHECK (status IN (
    'season_activated',
    'growth_phase',
    'scheduled_irrigation',
    'agronomic_care',
    'fruit_development',
    'pre_harvest',
    'harvest',
    'settlement',
    'processing_packaging',
    'season_closed'
  )),
  start_date TIMESTAMPTZ DEFAULT now(),
  expected_end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  current_phase TEXT DEFAULT 'تفعيل التشغيل',
  is_active BOOLEAN DEFAULT true,
  season_notes TEXT,
  total_costs DECIMAL(10, 2) DEFAULT 0,
  total_harvest DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(farm_id, season_number)
);

-- جدول مراحل الموسم
CREATE TABLE IF NOT EXISTS b2f_season_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES b2f_farm_seasons(id) ON DELETE CASCADE,
  phase_order INTEGER NOT NULL CHECK (phase_order BETWEEN 1 AND 10),
  phase_type TEXT NOT NULL CHECK (phase_type IN (
    'activation',
    'growth',
    'irrigation',
    'care',
    'fruiting',
    'pre_harvest',
    'harvest',
    'settlement',
    'processing',
    'closure'
  )),
  phase_status TEXT NOT NULL DEFAULT 'pending' CHECK (phase_status IN (
    'pending',
    'in_progress',
    'completed',
    'skipped'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  phase_notes TEXT,
  phase_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(season_id, phase_order)
);

-- جدول مهام المراحل
CREATE TABLE IF NOT EXISTS b2f_phase_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES b2f_season_phases(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'irrigation',
    'fertilization',
    'pruning',
    'pest_control',
    'maintenance',
    'inspection',
    'harvest_prep',
    'harvest_execution',
    'transport',
    'processing',
    'delivery',
    'other'
  )),
  task_status TEXT NOT NULL DEFAULT 'pending' CHECK (task_status IN (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
  )),
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  task_cost DECIMAL(10, 2) DEFAULT 0,
  task_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول ملفات الموسم
CREATE TABLE IF NOT EXISTS b2f_season_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES b2f_farm_seasons(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES b2f_season_phases(id) ON DELETE CASCADE,
  task_id UUID REFERENCES b2f_phase_tasks(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'document', 'report')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تكاليف الموسم
CREATE TABLE IF NOT EXISTS b2f_season_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES b2f_farm_seasons(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES b2f_season_phases(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL CHECK (cost_type IN (
    'water',
    'fertilizer',
    'pesticide',
    'labor',
    'transport',
    'processing',
    'packaging',
    'equipment',
    'maintenance',
    'other'
  )),
  cost_amount DECIMAL(10, 2) NOT NULL,
  cost_description TEXT,
  cost_date TIMESTAMPTZ DEFAULT now(),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول سجلات الحصاد
CREATE TABLE IF NOT EXISTS b2f_harvest_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES b2f_farm_seasons(id) ON DELETE CASCADE,
  harvest_date TIMESTAMPTZ DEFAULT now(),
  quantity_kg DECIMAL(10, 2) NOT NULL,
  quality_grade TEXT CHECK (quality_grade IN ('excellent', 'good', 'average', 'poor')),
  harvest_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تقارير الموسم
CREATE TABLE IF NOT EXISTS b2f_season_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES b2f_farm_seasons(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('final_report', 'interim_report', 'phase_report')),
  report_data JSONB DEFAULT '{}',
  report_pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by TEXT
);

-- تفعيل RLS
ALTER TABLE b2f_farm_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_season_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_phase_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_season_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_season_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_harvest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2f_season_reports ENABLE ROW LEVEL SECURITY;

-- سياسات للقراءة العامة (للمستثمرين)
CREATE POLICY "Investors can view seasons for their farms"
  ON b2f_farm_seasons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_investment_requests
      WHERE b2f_investment_requests.id = b2f_farm_seasons.request_id
    )
  );

CREATE POLICY "Investors can view phases"
  ON b2f_season_phases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_farm_seasons
      WHERE b2f_farm_seasons.id = b2f_season_phases.season_id
    )
  );

CREATE POLICY "Investors can view tasks"
  ON b2f_phase_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_season_phases
      WHERE b2f_season_phases.id = b2f_phase_tasks.phase_id
    )
  );

CREATE POLICY "Investors can view files"
  ON b2f_season_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_farm_seasons
      WHERE b2f_farm_seasons.id = b2f_season_files.season_id
    )
  );

CREATE POLICY "Investors can view costs"
  ON b2f_season_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_farm_seasons
      WHERE b2f_farm_seasons.id = b2f_season_costs.season_id
    )
  );

CREATE POLICY "Investors can view harvest records"
  ON b2f_harvest_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_farm_seasons
      WHERE b2f_farm_seasons.id = b2f_harvest_records.season_id
    )
  );

CREATE POLICY "Investors can view reports"
  ON b2f_season_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM b2f_farm_seasons
      WHERE b2f_farm_seasons.id = b2f_season_reports.season_id
    )
  );

-- سياسات للإدارة (كتابة كاملة)
CREATE POLICY "Admins can manage seasons"
  ON b2f_farm_seasons FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage phases"
  ON b2f_season_phases FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage tasks"
  ON b2f_phase_tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage files"
  ON b2f_season_files FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage costs"
  ON b2f_season_costs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage harvest records"
  ON b2f_harvest_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage reports"
  ON b2f_season_reports FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes للأداء
CREATE INDEX idx_seasons_farm ON b2f_farm_seasons(farm_id);
CREATE INDEX idx_seasons_status ON b2f_farm_seasons(status);
CREATE INDEX idx_seasons_active ON b2f_farm_seasons(is_active);
CREATE INDEX idx_phases_season ON b2f_season_phases(season_id);
CREATE INDEX idx_phases_status ON b2f_season_phases(phase_status);
CREATE INDEX idx_tasks_phase ON b2f_phase_tasks(phase_id);
CREATE INDEX idx_tasks_status ON b2f_phase_tasks(task_status);
CREATE INDEX idx_files_season ON b2f_season_files(season_id);
CREATE INDEX idx_costs_season ON b2f_season_costs(season_id);
CREATE INDEX idx_harvest_season ON b2f_harvest_records(season_id);
CREATE INDEX idx_reports_season ON b2f_season_reports(season_id);

-- دالة لتحديث نسبة التقدم تلقائياً
CREATE OR REPLACE FUNCTION update_season_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_phases INTEGER;
  completed_phases INTEGER;
  progress INTEGER;
BEGIN
  -- حساب عدد المراحل المكتملة
  SELECT COUNT(*) INTO total_phases
  FROM b2f_season_phases
  WHERE season_id = NEW.season_id;
  
  SELECT COUNT(*) INTO completed_phases
  FROM b2f_season_phases
  WHERE season_id = NEW.season_id AND phase_status = 'completed';
  
  -- حساب نسبة التقدم
  IF total_phases > 0 THEN
    progress := (completed_phases * 100 / total_phases);
    
    -- تحديث نسبة التقدم في جدول المواسم
    UPDATE b2f_farm_seasons
    SET 
      progress_percentage = progress,
      updated_at = now()
    WHERE id = NEW.season_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث نسبة التقدم عند تغيير حالة المرحلة
CREATE TRIGGER trigger_update_season_progress
AFTER UPDATE OF phase_status ON b2f_season_phases
FOR EACH ROW
EXECUTE FUNCTION update_season_progress();

-- دالة لإنشاء مراحل الموسم تلقائياً
CREATE OR REPLACE FUNCTION create_season_phases(p_season_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO b2f_season_phases (season_id, phase_order, phase_type, phase_status) VALUES
  (p_season_id, 1, 'activation', 'completed'),
  (p_season_id, 2, 'growth', 'pending'),
  (p_season_id, 3, 'irrigation', 'pending'),
  (p_season_id, 4, 'care', 'pending'),
  (p_season_id, 5, 'fruiting', 'pending'),
  (p_season_id, 6, 'pre_harvest', 'pending'),
  (p_season_id, 7, 'harvest', 'pending'),
  (p_season_id, 8, 'settlement', 'pending'),
  (p_season_id, 9, 'processing', 'pending'),
  (p_season_id, 10, 'closure', 'pending');
END;
$$ LANGUAGE plpgsql;

-- دالة لإحصائيات الموسم
CREATE OR REPLACE FUNCTION get_season_statistics(p_season_id UUID)
RETURNS TABLE (
  total_tasks INTEGER,
  completed_tasks INTEGER,
  pending_tasks INTEGER,
  total_costs DECIMAL,
  total_harvest DECIMAL,
  current_phase TEXT,
  progress_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM b2f_phase_tasks pt 
     JOIN b2f_season_phases sp ON sp.id = pt.phase_id 
     WHERE sp.season_id = p_season_id),
    (SELECT COUNT(*)::INTEGER FROM b2f_phase_tasks pt 
     JOIN b2f_season_phases sp ON sp.id = pt.phase_id 
     WHERE sp.season_id = p_season_id AND pt.task_status = 'completed'),
    (SELECT COUNT(*)::INTEGER FROM b2f_phase_tasks pt 
     JOIN b2f_season_phases sp ON sp.id = pt.phase_id 
     WHERE sp.season_id = p_season_id AND pt.task_status = 'pending'),
    (SELECT COALESCE(SUM(cost_amount), 0) FROM b2f_season_costs WHERE season_id = p_season_id),
    (SELECT COALESCE(SUM(quantity_kg), 0) FROM b2f_harvest_records WHERE season_id = p_season_id),
    (SELECT current_phase FROM b2f_farm_seasons WHERE id = p_season_id),
    (SELECT progress_percentage FROM b2f_farm_seasons WHERE id = p_season_id);
END;
$$ LANGUAGE plpgsql;
