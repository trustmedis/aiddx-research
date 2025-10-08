-- Add rater_demographics table for post-survey questions
CREATE TABLE rater_demographics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rater_id TEXT NOT NULL UNIQUE,
  years_of_practice INTEGER NOT NULL,
  practice_location TEXT NOT NULL, -- 'hospital', 'clinic', 'puskesmas', 'home'
  ai_clinical_reasoning_confidence INTEGER NOT NULL, -- 1-5 Likert scale
  ai_safety_concern INTEGER NOT NULL, -- 1-5 Likert scale
  ai_decision_support_willingness INTEGER NOT NULL, -- 1-3 scale
  ai_concerns TEXT NOT NULL, -- JSON array of concerns
  phone_number TEXT, -- Optional phone number for prize lottery
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries by rater_id
CREATE INDEX idx_rater_demographics_rater ON rater_demographics(rater_id);
