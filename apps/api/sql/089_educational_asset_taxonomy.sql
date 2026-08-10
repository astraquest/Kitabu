CREATE TABLE IF NOT EXISTS educational_asset_taxonomy_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 160),
  parent_term_id UUID REFERENCES educational_asset_taxonomy_terms(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (code = lower(code)),
  CHECK (code ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  CHECK (parent_term_id IS NULL OR parent_term_id <> id)
);

CREATE TABLE IF NOT EXISTS educational_asset_taxonomy_links (
  asset_id UUID NOT NULL REFERENCES educational_assets(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES educational_asset_taxonomy_terms(id) ON DELETE RESTRICT,
  relationship_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(relationship_metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_educational_asset_taxonomy_terms_parent
  ON educational_asset_taxonomy_terms (parent_term_id, sort_order, code);
CREATE INDEX IF NOT EXISTS idx_educational_asset_taxonomy_links_term
  ON educational_asset_taxonomy_links (term_id, asset_id);

INSERT INTO educational_asset_taxonomy_terms (code, display_name, parent_term_id, sort_order)
VALUES
  ('agriculture', 'Agriculture', NULL, 10),
  ('biology', 'Biology', NULL, 20),
  ('business-life-skills', 'Business and Life Skills', NULL, 30),
  ('chemistry', 'Chemistry', NULL, 40),
  ('computer-studies', 'Computer Studies', NULL, 50),
  ('creative-arts', 'Creative Arts', NULL, 60),
  ('english', 'English', NULL, 70),
  ('environment', 'Environment', NULL, 80),
  ('geography', 'Geography', NULL, 90),
  ('general-science', 'General Science', NULL, 100),
  ('general', 'General', NULL, 105),
  ('health', 'Health', NULL, 110),
  ('history', 'History', NULL, 120),
  ('kiswahili', 'Kiswahili', NULL, 130),
  ('lower-primary', 'Lower Primary', NULL, 140),
  ('mathematics', 'Mathematics', NULL, 150),
  ('music', 'Music', NULL, 160),
  ('physics', 'Physics', NULL, 170),
  ('science', 'Science', NULL, 175),
  ('astronomy', 'Astronomy', NULL, 176),
  ('social-studies', 'Social Studies', NULL, 180),
  ('social', 'Social Studies', NULL, 181),
  ('social_studies', 'Social Studies', NULL, 182),
  ('sports', 'Sports', NULL, 190),
  ('technology', 'Technology', NULL, 200)
ON CONFLICT (code) DO UPDATE
SET display_name = EXCLUDED.display_name,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE;

INSERT INTO educational_asset_taxonomy_terms (code, display_name, parent_term_id, sort_order)
SELECT child.code, child.display_name, parent.id, child.sort_order
FROM (VALUES
  ('biology.anatomy', 'Anatomy', 'biology', 10),
  ('biology.cells', 'Cells', 'biology', 20),
  ('biology.genetics', 'Genetics', 'biology', 30),
  ('biology.ecology', 'Ecology', 'biology', 40),
  ('biology.animals', 'Animals', 'biology', 50),
  ('physics.forces', 'Forces', 'physics', 10),
  ('physics.machines', 'Machines', 'physics', 20),
  ('physics.electricity', 'Electricity', 'physics', 30),
  ('physics.energy', 'Energy', 'physics', 40),
  ('physics.motion', 'Motion', 'physics', 50),
  ('physics.light', 'Light', 'physics', 60),
  ('physics.sound', 'Sound', 'physics', 70),
  ('chemistry.atoms', 'Atoms', 'chemistry', 10),
  ('chemistry.molecules', 'Molecules', 'chemistry', 20),
  ('chemistry.materials', 'Materials', 'chemistry', 30),
  ('lower-primary.animals', 'Animals', 'lower-primary', 10),
  ('lower-primary.foods', 'Foods', 'lower-primary', 20),
  ('lower-primary.transport', 'Transport', 'lower-primary', 30),
  ('lower-primary.weather', 'Weather', 'lower-primary', 40),
  ('lower-primary.water', 'Water', 'lower-primary', 50),
  ('lower-primary.soil', 'Soil', 'lower-primary', 60),
  ('lower-primary.plants', 'Plants', 'lower-primary', 70),
  ('lower-primary.safety', 'Safety', 'lower-primary', 80),
  ('mathematics.numbers', 'Numbers', 'mathematics', 10),
  ('mathematics.geometry', 'Geometry', 'mathematics', 20),
  ('mathematics.measurement', 'Measurement', 'mathematics', 30),
  ('mathematics.data', 'Data', 'mathematics', 40),
  ('geography.maps', 'Maps', 'geography', 10),
  ('geography.weather', 'Weather', 'geography', 20),
  ('health.human-body', 'Human Body', 'health', 10),
  ('health.nutrition', 'Nutrition', 'health', 20),
  ('computer-studies.hardware', 'Hardware', 'computer-studies', 10),
  ('computer-studies.digital-safety', 'Digital Safety', 'computer-studies', 20),
  ('environment.conservation', 'Conservation', 'environment', 10),
  ('creative-arts.visual-arts', 'Visual Arts', 'creative-arts', 10),
  ('creative-arts.performing-arts', 'Performing Arts', 'creative-arts', 20),
  ('social-studies.community', 'Community', 'social-studies', 10),
  ('history.kenya', 'Kenya History', 'history', 10),
  ('agriculture.crops', 'Crops', 'agriculture', 10),
  ('technology.tools', 'Tools', 'technology', 10)
) AS child(code, display_name, parent_code, sort_order)
JOIN educational_asset_taxonomy_terms parent ON parent.code = child.parent_code
ON CONFLICT (code) DO UPDATE
SET display_name = EXCLUDED.display_name,
    parent_term_id = EXCLUDED.parent_term_id,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE;

INSERT INTO educational_asset_taxonomy_terms (code, display_name, parent_term_id, sort_order)
SELECT child.code, child.display_name, parent.id, child.sort_order
FROM (VALUES
  ('biology.anatomy.human-body', 'Human Body', 'biology.anatomy', 10),
  ('biology.anatomy.body-systems', 'Body Systems', 'biology.anatomy', 20),
  ('biology.anatomy.organs', 'Organs', 'biology.anatomy', 30),
  ('biology.cells.cell-structure', 'Cell Structure', 'biology.cells', 10),
  ('biology.cells.cell-membrane', 'Cell Membrane', 'biology.cells', 20),
  ('biology.cells.cell-division', 'Cell Division', 'biology.cells', 30),
  ('biology.genetics.dna', 'DNA', 'biology.genetics', 10),
  ('biology.genetics.heredity', 'Heredity', 'biology.genetics', 20),
  ('biology.genetics.inheritance', 'Inheritance', 'biology.genetics', 30),
  ('physics.machines.lever', 'Lever', 'physics.machines', 10),
  ('physics.machines.pulley', 'Pulley', 'physics.machines', 20),
  ('physics.machines.inclined-plane', 'Inclined Plane', 'physics.machines', 30),
  ('science.life-science', 'Life Science', 'science', 10),
  ('science.physical-science', 'Physical Science', 'science', 20),
  ('science.earth-science', 'Earth Science', 'science', 30),
  ('astronomy.solar-system', 'Solar System', 'astronomy', 10),
  ('astronomy.stars', 'Stars', 'astronomy', 20),
  ('astronomy.earth-moon-sun', 'Earth, Moon, and Sun', 'astronomy', 30),
  ('general.observation', 'Observation', 'general', 10),
  ('general.objects', 'Objects', 'general', 20),
  ('general.patterns', 'Patterns', 'general', 30),
  ('social.community', 'Community', 'social', 10),
  ('social.maps', 'Maps', 'social', 20),
  ('social.citizenship', 'Citizenship', 'social', 30),
  ('social_studies.community', 'Community', 'social_studies', 10),
  ('social_studies.maps', 'Maps', 'social_studies', 20),
  ('social_studies.citizenship', 'Citizenship', 'social_studies', 30)
) AS child(code, display_name, parent_code, sort_order)
JOIN educational_asset_taxonomy_terms parent ON parent.code = child.parent_code
ON CONFLICT (code) DO UPDATE
SET display_name = EXCLUDED.display_name,
    parent_term_id = EXCLUDED.parent_term_id,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE;
