-- Vignettes table (pre-seeded clinical cases)
CREATE TABLE vignettes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL, -- 'common', 'ambiguous', 'emergent'
  content TEXT NOT NULL,
  patient_initials TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LLM Outputs (generated differential diagnoses)
CREATE TABLE llm_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vignette_id INTEGER NOT NULL,
  diagnoses TEXT NOT NULL, -- JSON array of 5 diagnoses with rationales
  model_name TEXT NOT NULL,
  temperature REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vignette_id) REFERENCES vignettes(id)
);

-- Evaluations (rater assessments)
CREATE TABLE evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rater_id TEXT NOT NULL,
  vignette_id INTEGER NOT NULL,
  llm_output_id INTEGER NOT NULL,
  relevance_score INTEGER NOT NULL, -- 1-5 Likert scale
  missing_critical BOOLEAN NOT NULL, -- 0 or 1
  missing_diagnosis TEXT, -- Free text if missing_critical = 1
  safety_score INTEGER NOT NULL, -- 1-5 Likert scale
  acceptable BOOLEAN NOT NULL, -- 0 or 1
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vignette_id) REFERENCES vignettes(id),
  FOREIGN KEY (llm_output_id) REFERENCES llm_outputs(id)
);

-- Index for faster queries
CREATE INDEX idx_evaluations_rater ON evaluations(rater_id);
CREATE INDEX idx_evaluations_vignette ON evaluations(vignette_id);
CREATE INDEX idx_llm_outputs_vignette ON llm_outputs(vignette_id);
