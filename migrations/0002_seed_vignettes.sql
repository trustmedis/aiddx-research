-- Seed vignettes: 6 common, 5 ambiguous, 4 emergent

-- COMMON CASES (6)
INSERT INTO vignettes (category, patient_initials, content) VALUES
('common', 'J.S.', 'Patient is a 28-year-old female presenting with 3 days of nasal congestion, sore throat, and mild cough. No fever. She reports similar symptoms in coworkers. Vital signs: BP 118/76, HR 72, temp 37.1°C, SpO2 98%. Physical exam shows erythematous pharynx without exudate, clear lung sounds bilaterally. No lymphadenopathy. Patient is otherwise healthy, no chronic conditions.'),

('common', 'M.R.', 'Patient is a 45-year-old male with 2 weeks of lower back pain after helping a friend move furniture. Pain is worse with movement, relieved with rest. No radiation to legs, no numbness or tingling. Vital signs: BP 132/84, HR 78, temp 36.8°C. Neurological exam normal, straight leg raise negative bilaterally. Full range of motion with pain. No red flags noted.'),

('common', 'A.T.', 'Patient is a 35-year-old female with 4 days of burning sensation with urination and increased urinary frequency. No fever, no flank pain. Vital signs: BP 120/78, HR 74, temp 36.9°C. Abdomen soft, mild suprapubic tenderness. CVA tenderness absent bilaterally. Urine dipstick positive for leukocyte esterase and nitrites.'),

('common', 'K.L.', 'Patient is a 52-year-old male with gastroesophageal reflux symptoms for 6 months. Burning chest pain after meals, worse when lying down. Denies weight loss, dysphagia, or vomiting. Takes occasional antacids with relief. Vital signs: BP 128/82, HR 76, temp 36.7°C. Abdomen soft, non-tender. No alarm symptoms present.'),

('common', 'D.P.', 'Patient is a 42-year-old female with right knee pain for 1 week after jogging. Pain on medial side of knee, swelling noted. No locking or giving way. Able to bear weight. Vital signs normal. Exam shows medial joint line tenderness, small effusion, McMurray test negative. No ligamentous laxity.'),

('common', 'R.W.', 'Patient is a 65-year-old male with type 2 diabetes presenting for routine follow-up. Blood sugars have been running 140-180 mg/dL fasting. Currently on metformin 1000mg twice daily. No acute complaints. Vital signs: BP 136/86, HR 72, BMI 31. HbA1c result pending. Foot exam shows intact sensation, palpable pulses.'),

-- AMBIGUOUS CASES (5)
('ambiguous', 'L.M.', 'Patient is a 38-year-old female with 6 weeks of fatigue, intermittent low-grade fever (37.8°C), and joint pain affecting hands and wrists bilaterally. Morning stiffness lasting 90 minutes. Denies rash, weight loss. Vital signs: BP 118/74, HR 84, temp 37.6°C. Symmetric swelling of MCPs and PIPs bilaterally. No other joint involvement noted. Labs pending.'),

('ambiguous', 'T.H.', 'Patient is a 29-year-old male with 3 months of intermittent abdominal pain, bloating, and alternating diarrhea and constipation. Pain improves after bowel movements. Denies blood in stool, weight loss, or nocturnal symptoms. Vital signs normal. Abdomen soft, mildly tender in left lower quadrant. No masses. CBC and CRP normal.'),

('ambiguous', 'N.B.', 'Patient is a 56-year-old female with 2 months of progressive dyspnea on exertion and dry cough. No chest pain. Former smoker (20 pack-years, quit 5 years ago). Vital signs: BP 124/78, HR 88, RR 18, SpO2 94% on room air. Lung exam reveals bibasilar fine crackles. No wheezing. Chest X-ray shows reticular opacities. PFTs pending.'),

('ambiguous', 'C.G.', 'Patient is a 47-year-old male with 4 weeks of headaches, predominantly morning, associated with nausea. Describes as pressure-like, bilateral. No visual changes initially, but reports recent blurry vision episodes. No fever. Vital signs: BP 142/88, HR 76, temp 36.8°C. Neurological exam shows subtle papilledema on fundoscopy. No focal deficits.'),

('ambiguous', 'S.K.', 'Patient is a 33-year-old female with 8 weeks of palpitations, heat intolerance, and 5kg weight loss despite increased appetite. Denies chest pain or syncope. Vital signs: BP 128/68, HR 102, temp 37.2°C. Exam shows fine tremor of outstretched hands, warm moist skin. Thyroid not significantly enlarged. TSH result pending.'),

-- EMERGENT/RED FLAG CASES (4)
('emergent', 'F.N.', 'Patient is a 54-year-old male with acute onset severe chest pain radiating to left arm, started 2 hours ago while at rest. Associated with diaphoresis and nausea. History of hypertension and smoking (30 pack-years). Vital signs: BP 158/94, HR 102, RR 20, SpO2 96%. Patient appears anxious, diaphoretic. Chest pain ongoing despite aspirin. ECG shows ST elevations in leads II, III, aVF. Troponin pending.'),

('emergent', 'V.S.', 'Patient is a 68-year-old female with sudden onset of right-sided weakness and slurred speech 45 minutes ago. Husband noticed she could not lift right arm and speech was garbled. History of atrial fibrillation (not on anticoagulation). Vital signs: BP 168/96, HR 88 irregular, temp 36.9°C, glucose 128 mg/dL. NIH stroke scale 8. Right facial droop, right arm drift, dysarthria present.'),

('emergent', 'P.D.', 'Patient is a 41-year-old male with sudden severe headache ("worst headache of my life") that started 1 hour ago during exercise. Associated with vomiting and photophobia. No prior history of migraines. Vital signs: BP 178/102, HR 94, temp 37.0°C. Patient appears in distress. Neck stiffness present. Neurological exam otherwise non-focal. No trauma history.'),

('emergent', 'E.R.', 'Patient is a 72-year-old female with 6 hours of severe abdominal pain, distension, and vomiting. Has not passed stool or gas for 24 hours. History of prior abdominal surgery (cholecystectomy 10 years ago). Vital signs: BP 108/68, HR 112, temp 37.4°C. Abdomen markedly distended, tympanic, with high-pitched bowel sounds. Tenderness throughout, no rebound. Abdominal X-ray shows dilated loops of small bowel.');
