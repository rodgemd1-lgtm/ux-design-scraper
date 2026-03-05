-- UX Design Scraper — Supabase Schema
-- Generated for the Double Black Box AI Design Intelligence Platform

-- ============================================
-- PROJECTS (scrape sessions)
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scraping', 'analyzing', 'generating', 'complete', 'error')),
  project_context JSONB DEFAULT '{}'::jsonb,
  scrape_config JSONB DEFAULT '{}'::jsonb,
  overall_score NUMERIC,
  scrape_duration_ms INTEGER,
  total_components INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  accessibility_score NUMERIC,
  performance_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================
-- DESIGN TOKENS
-- ============================================
CREATE TABLE design_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token_type TEXT NOT NULL
    CHECK (token_type IN ('color', 'spacing', 'shadow', 'radius', 'z-index', 'opacity', 'typography', 'animation')),
  token_name TEXT,
  token_value TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  contexts TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tokens_project ON design_tokens(project_id);
CREATE INDEX idx_tokens_type ON design_tokens(token_type);

-- ============================================
-- COMPONENTS
-- ============================================
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  component_type TEXT,
  html_code TEXT,
  css_code TEXT,
  selector TEXT,
  state_variants JSONB DEFAULT '{}'::jsonb,
  accessibility_data JSONB DEFAULT '{}'::jsonb,
  scores JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_components_project ON components(project_id);
CREATE INDEX idx_components_type ON components(component_type);

-- ============================================
-- SCREENSHOTS
-- ============================================
CREATE TABLE screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  breakpoint INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  page_url TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_screenshots_project ON screenshots(project_id);

-- ============================================
-- HEATMAPS
-- ============================================
CREATE TABLE heatmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  heatmap_type TEXT NOT NULL
    CHECK (heatmap_type IN ('click', 'scroll', 'attention', 'movement')),
  source TEXT NOT NULL
    CHECK (source IN ('hotjar_api', 'fullstory_api', 'dom_scrape')),
  page_url TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  storage_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_heatmaps_project ON heatmaps(project_id);

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL
    CHECK (doc_type IN ('best_practice', 'design_system', 'role_experience', 'pattern_library', 'analysis', 'prompt', 'workflow')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kb_project ON knowledge_base(project_id);
CREATE INDEX idx_kb_type ON knowledge_base(doc_type);

-- ============================================
-- COMPETITOR ANALYSIS
-- ============================================
CREATE TABLE competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  competitor_url TEXT NOT NULL,
  competitor_name TEXT,
  comparison_matrix JSONB DEFAULT '{}'::jsonb,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  overall_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_competitor_project ON competitor_analysis(project_id);

-- ============================================
-- FLOW ANALYSIS
-- ============================================
CREATE TABLE flow_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  flow_name TEXT NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb,
  total_steps INTEGER DEFAULT 0,
  estimated_time_seconds INTEGER,
  friction_score NUMERIC,
  cognitive_load_score NUMERIC,
  conversion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_flow_project ON flow_analysis(project_id);

-- ============================================
-- DESIGN VERSIONS (Wayback Machine)
-- ============================================
CREATE TABLE design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_url TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  wayback_url TEXT NOT NULL,
  thumbnail_path TEXT,
  key_changes TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_versions_project ON design_versions(project_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE heatmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own projects
CREATE POLICY "Users access own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id);

-- Child tables: access through project ownership
CREATE POLICY "Users access own design_tokens"
  ON design_tokens FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own components"
  ON components FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own screenshots"
  ON screenshots FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own heatmaps"
  ON heatmaps FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own knowledge_base"
  ON knowledge_base FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own competitor_analysis"
  ON competitor_analysis FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own flow_analysis"
  ON flow_analysis FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users access own design_versions"
  ON design_versions FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- ============================================
-- STORAGE BUCKETS (run via Supabase dashboard or CLI)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('heatmaps', 'heatmaps', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', false);

-- Storage RLS policies
-- CREATE POLICY "Users access own screenshots" ON storage.objects
--   FOR ALL USING (bucket_id = 'screenshots' AND (storage.foldername(name))[1] IN
--     (SELECT id::text FROM projects WHERE user_id = auth.uid()));

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
