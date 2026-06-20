-- ============================================================
-- REFERRAL PLATFORM SCHEMA
-- Layer 1: EMR Core | Layer 2: Differentiation | Layer 3: Learning
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- LAYER 1: EMR CORE
-- ============================================================

CREATE TABLE IF NOT EXISTS clinics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    province TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT,
    npi TEXT UNIQUE,
    clinic_id INTEGER,
    email TEXT,
    phone TEXT,
    FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mrn TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    dob DATE,
    gender TEXT,
    age INTEGER,
    language TEXT DEFAULT 'English',
    city TEXT,
    province TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    visit_date DATE NOT NULL,
    chief_complaint TEXT,
    diagnosis TEXT,
    medications TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS visit_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL,
    note_type TEXT DEFAULT 'SOAP',
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(visit_id) REFERENCES visits(id)
);

-- ============================================================
-- LAYER 2: DIFFERENTIATION
-- ============================================================

CREATE TABLE IF NOT EXISTS specialists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    clinic_id INTEGER,
    clinic_name TEXT,
    address TEXT,
    city TEXT DEFAULT 'Toronto',
    province TEXT DEFAULT 'ON',
    latitude REAL,
    longitude REAL,
    language TEXT DEFAULT 'English',
    accepting_patients BOOLEAN DEFAULT 1,
    waitlist_days INTEGER DEFAULT 30,
    email TEXT,
    phone TEXT,
    FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS specialist_constraints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialist_id INTEGER NOT NULL,
    constraint_type TEXT NOT NULL,
    field_value TEXT NOT NULL,
    FOREIGN KEY(specialist_id) REFERENCES specialists(id)
);

CREATE TABLE IF NOT EXISTS specialty_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialty TEXT NOT NULL,
    requirement_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    required BOOLEAN DEFAULT 1,
    extraction_hint TEXT,
    rejection_count INTEGER DEFAULT 0,
    avg_rejection_rate REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS documentation_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialty TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    doc_description TEXT NOT NULL,
    required BOOLEAN DEFAULT 1,
    examples TEXT
);

CREATE TABLE IF NOT EXISTS clinic_form_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_id INTEGER NOT NULL,
    specialty TEXT NOT NULL,
    form_field_name TEXT NOT NULL,
    label TEXT NOT NULL,
    required BOOLEAN DEFAULT 0,
    field_order INTEGER DEFAULT 0,
    FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS referral_forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialty TEXT NOT NULL,
    clinic_id INTEGER,
    form_template TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(clinic_id) REFERENCES clinics(id)
);

-- ============================================================
-- LAYER 3: LEARNING & AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS scribe_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER,
    raw_content TEXT NOT NULL,
    source_type TEXT DEFAULT 'paste',
    extracted_data TEXT,
    extraction_version TEXT DEFAULT 'v1_regex',
    confidence_score REAL DEFAULT 0.0,
    manually_verified BOOLEAN DEFAULT 0,
    extraction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(visit_id) REFERENCES visits(id)
);

CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    from_provider_id INTEGER NOT NULL,
    target_specialty TEXT NOT NULL,
    target_specialist_id INTEGER,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    rejection_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(from_provider_id) REFERENCES providers(id),
    FOREIGN KEY(target_specialist_id) REFERENCES specialists(id)
);

CREATE TABLE IF NOT EXISTS rejection_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referral_id INTEGER NOT NULL,
    rejected_by_specialist_id INTEGER,
    rejection_reason TEXT,
    field_missing TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(referral_id) REFERENCES referrals(id),
    FOREIGN KEY(rejected_by_specialist_id) REFERENCES specialists(id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Clinics
INSERT INTO clinics (name, address, city, province, phone, email) VALUES
    ('Toronto General Family Practice', '200 Elizabeth St', 'Toronto', 'ON', '416-555-0100', 'referrals@tgfp.ca'),
    ('North York Medical Centre', '4001 Leslie St', 'North York', 'ON', '416-555-0200', 'admin@nymc.ca'),
    ('Midtown Health Clinic', '790 Bay St', 'Toronto', 'ON', '416-555-0300', 'info@midtownhealth.ca');

-- Providers (referring physicians)
INSERT INTO providers (name, specialty, npi, clinic_id, email) VALUES
    ('Dr. Patricia Okonkwo', 'Family Medicine', 'NPI-001', 1, 'p.okonkwo@tgfp.ca'),
    ('Dr. Marcus Webb', 'Internal Medicine', 'NPI-002', 1, 'm.webb@tgfp.ca'),
    ('Dr. Aisha Ndiaye', 'Family Medicine', 'NPI-003', 2, 'a.ndiaye@nymc.ca');

-- Patients (synthetic only — fake names + MRNs)
INSERT INTO patients (mrn, name, dob, gender, age, language, city, province) VALUES
    ('MRN-10001', 'Test Patient A', '1989-03-12', 'M', 35, 'English', 'Toronto', 'ON'),
    ('MRN-10002', 'Test Patient B', '1996-07-25', 'F', 28, 'English', 'North York', 'ON'),
    ('MRN-10003', 'Test Patient C', '1974-11-04', 'M', 50, 'English', 'Scarborough', 'ON'),
    ('MRN-10004', 'Test Patient D', '1985-02-18', 'F', 39, 'French', 'Toronto', 'ON'),
    ('MRN-10005', 'Test Patient E', '2001-09-30', 'M', 23, 'Mandarin', 'Markham', 'ON');

-- Visits
INSERT INTO visits (patient_id, provider_id, visit_date, chief_complaint, diagnosis) VALUES
    (1, 1, '2024-06-15', 'Asthma follow-up', 'J45.0'),
    (2, 1, '2024-06-16', 'Moderate acne, face and back', 'L70.0'),
    (3, 2, '2024-06-17', 'Chest discomfort, exertional', 'I25.10'),
    (4, 3, '2024-06-18', 'Asthma worsening', 'J45.1'),
    (5, 1, '2024-06-19', 'Acne follow-up', 'L70.0');

-- Visit notes (sample text for testing extraction)
INSERT INTO visit_notes (visit_id, note_type, content) VALUES
    (1, 'SOAP', 'Chief complaint: asthma follow-up. Patient has been on Fluticasone 220mcg daily and Albuterol inhaler PRN. Recent spirometry (2024-06-10) shows FEV1 72%, FEV1/FVC 0.74. Peak flow measured at home: 380 L/min. Exacerbations: patient reports 2-3 episodes per month, triggered by exercise and grass pollen. No nighttime symptoms. Overall well-controlled on current regimen. Recommend refer to pulmonology for advanced management options.'),
    (2, 'SOAP', 'Chief complaint: moderate acne, face and back. Female, age 28. Duration: 18 months, worsening. Treatments tried: benzoyl peroxide 5% x3mo, salicylic acid wash x2mo, no significant improvement. Skin type: oily, prone to comedones. Physical exam: mixed comedonal and inflammatory lesions, grade 2 severity. No scarring noted. Recommend dermatology referral for possible isotretinoin evaluation.'),
    (3, 'SOAP', 'HPI: Chest discomfort x2 weeks, substernal, worse with exertion, improved with rest. Recent echo (2024-06-12): EF 52%, mild LV dysfunction, no wall motion abnormalities. Vital signs: BP 145/92, HR 88, RR 16. Current meds: Metoprolol 25mg BID, Lisinopril 10mg daily. Hx: HTN x5yr, diagnosed age 50. Recommend cardiology referral for possible revascularization workup.');

-- Specialists
INSERT INTO specialists (name, specialty, clinic_name, city, latitude, longitude, language, accepting_patients, waitlist_days, email) VALUES
    -- Pulmonology
    ('Dr. Sarah Chen', 'Pulmonology', 'Toronto Lung Centre', 'Toronto', 43.6532, -79.3832, 'English, Mandarin', 1, 14, 'dr.chen@torontolung.ca'),
    ('Dr. James Smith', 'Pulmonology', 'North York Respirology', 'North York', 43.7615, -79.4111, 'English', 1, 21, 'dr.smith@nyresp.ca'),
    ('Dr. Marie Tremblay', 'Pulmonology', 'Midtown Respirology', 'Toronto', 43.6629, -79.3957, 'English, French', 1, 7, 'dr.tremblay@midtownresp.ca'),
    ('Dr. Kevin Park', 'Pulmonology', 'Scarborough Lung Clinic', 'Scarborough', 43.7764, -79.2318, 'English, Korean', 0, 45, 'dr.park@scarbllung.ca'),
    ('Dr. Fatima Al-Hassan', 'Pulmonology', 'Downtown Respirology Associates', 'Toronto', 43.6484, -79.3799, 'English, Arabic', 1, 28, 'dr.alhassan@dra.ca'),
    -- Dermatology
    ('Dr. Maria Garcia', 'Dermatology', 'Midtown Derm Clinic', 'Toronto', 43.6690, -79.3883, 'English, Spanish', 1, 7, 'dr.garcia@midtownderm.ca'),
    ('Dr. Jennifer Wong', 'Dermatology', 'Skin Health Toronto', 'Toronto', 43.6558, -79.3788, 'English, Cantonese', 1, 14, 'dr.wong@skinhealth.ca'),
    ('Dr. Robert Patel', 'Dermatology', 'North York Dermatology', 'North York', 43.7680, -79.4132, 'English, Hindi', 1, 21, 'dr.patel@nyderma.ca'),
    ('Dr. Claire Bouchard', 'Dermatology', 'Toronto Skin Institute', 'Toronto', 43.6621, -79.3892, 'English, French', 1, 10, 'dr.bouchard@tsi.ca'),
    -- Cardiology
    ('Dr. David Lee', 'Cardiology', 'Toronto Heart Centre', 'Toronto', 43.6527, -79.3814, 'English, Cantonese', 0, 30, 'dr.lee@torontoheart.ca'),
    ('Dr. Priya Sharma', 'Cardiology', 'North York Cardiology', 'North York', 43.7701, -79.4088, 'English, Hindi', 1, 21, 'dr.sharma@nycardio.ca'),
    ('Dr. Thomas Nguyen', 'Cardiology', 'Cardiovascular Clinic of Toronto', 'Toronto', 43.6593, -79.3829, 'English, Vietnamese', 1, 35, 'dr.nguyen@cct.ca'),
    ('Dr. Elena Rossi', 'Cardiology', 'Downtown Cardiology Group', 'Toronto', 43.6501, -79.3777, 'English, Italian', 1, 18, 'dr.rossi@dcg.ca'),
    ('Dr. Andrew Kim', 'Cardiology', 'Scarborough Cardiac Centre', 'Scarborough', 43.7820, -79.2350, 'English, Korean', 1, 42, 'dr.kim@scc.ca'),
    -- Mixed specialty (for constraint testing)
    ('Dr. Yuki Tanaka', 'Dermatology', 'Women Health Dermatology', 'Toronto', 43.6610, -79.3865, 'English, Japanese', 1, 5, 'dr.tanaka@whd.ca');

-- Specialist constraints
INSERT INTO specialist_constraints (specialist_id, constraint_type, field_value) VALUES
    -- Dr. Garcia (Derm): women only for acne
    (6, 'gender_only', 'F'),
    (6, 'age_max', '45'),
    -- Dr. Tanaka (Derm): women only, all ages
    (15, 'gender_only', 'F'),
    -- Dr. Park (Pulm): not accepting
    (4, 'accepting_patients', 'false'),
    -- Dr. Lee (Cardio): not accepting
    (10, 'accepting_patients', 'false'),
    -- Dr. Sharma (Cardio): age minimum for complex cases
    (11, 'age_min', '18'),
    -- Dr. Kim (Cardio): exclude pediatric
    (14, 'age_min', '21');

-- Specialty requirements: Pulmonology / Asthma
INSERT INTO specialty_requirements (specialty, requirement_id, field_name, required, extraction_hint, rejection_count) VALUES
    ('Pulmonology', 'pulm_fev1', 'FEV1', 1, 'FEV1|spirometry|lung function', 45),
    ('Pulmonology', 'pulm_fev1fvc', 'FEV1/FVC Ratio', 1, 'FEV1/FVC|FEV1.FVC', 38),
    ('Pulmonology', 'pulm_controller', 'Controller Medication', 1, 'fluticasone|budesonide|mometasone|beclomethasone|controller', 29),
    ('Pulmonology', 'pulm_exacerbation', 'Exacerbation Frequency', 1, 'exacerbation|episode|attack|flare', 52),
    ('Pulmonology', 'pulm_diagnosis', 'Diagnosis Code', 1, 'J45|asthma|COPD|J44', 18),
    ('Pulmonology', 'pulm_peak_flow', 'Peak Flow', 0, 'peak flow|PEFR|peak expiratory', 12),
    ('Pulmonology', 'pulm_triggers', 'Known Triggers', 0, 'trigger|precipitant|allergen', 8),
    ('Pulmonology', 'pulm_nocturnal', 'Nocturnal Symptoms', 0, 'nocturnal|night|sleep', 6),
    -- Dermatology / Acne
    ('Dermatology', 'derm_duration', 'Duration of Acne', 1, 'duration|months|years|since|started', 31),
    ('Dermatology', 'derm_prior_tx', 'Prior Treatments Tried', 1, 'tried|used|benzoyl|salicylic|tretinoin|clindamycin|previous treatment', 48),
    ('Dermatology', 'derm_severity', 'Severity Grade', 1, 'grade|mild|moderate|severe|comedonal|inflammatory|cystic', 27),
    ('Dermatology', 'derm_diagnosis', 'Diagnosis Code', 1, 'L70|acne', 15),
    ('Dermatology', 'derm_location', 'Lesion Location', 0, 'face|back|chest|forehead|jawline', 9),
    ('Dermatology', 'derm_scarring', 'Scarring Present', 0, 'scar|scarring|atrophic|post-inflammatory', 7),
    -- Cardiology
    ('Cardiology', 'cardio_ef', 'Ejection Fraction (EF)', 1, 'EF|ejection fraction|echo|echocardiogram', 41),
    ('Cardiology', 'cardio_bp', 'Blood Pressure', 1, 'BP|blood pressure|systolic|diastolic', 22),
    ('Cardiology', 'cardio_diagnosis', 'Diagnosis Code', 1, 'I25|I21|I10|HTN|CAD|ACS|chest pain', 19),
    ('Cardiology', 'cardio_cardiac_med', 'Cardiac Medications', 1, 'metoprolol|lisinopril|amlodipine|atorvastatin|aspirin|beta blocker|ACE|statin', 33),
    ('Cardiology', 'cardio_symptoms', 'Symptom Description', 1, 'chest|dyspnea|palpitation|syncope|angina', 28),
    ('Cardiology', 'cardio_hr', 'Heart Rate', 0, 'HR|heart rate|pulse', 11),
    ('Cardiology', 'cardio_echo_date', 'Echo Date', 0, 'echo|echocardiogram|2024|2025', 14);

-- Documentation requirements
INSERT INTO documentation_requirements (specialty, doc_type, doc_description, required, examples) VALUES
    ('Pulmonology', 'lab', 'Spirometry report within 6 months', 1, 'FEV1, FVC, FEV1/FVC ratio'),
    ('Pulmonology', 'imaging', 'Chest X-ray within 12 months', 0, 'CXR, CT chest'),
    ('Pulmonology', 'prior_records', 'Current asthma action plan', 0, 'written action plan from GP'),
    ('Dermatology', 'prior_records', 'Previous treatment records (failed therapies)', 1, 'dates + products used, response/failure noted'),
    ('Dermatology', 'imaging', 'Clinical photos if available', 0, 'face/back close-ups'),
    ('Dermatology', 'lab', 'Pregnancy test if isotretinoin candidate (female, childbearing age)', 0, 'serum hCG within 30 days'),
    ('Cardiology', 'imaging', 'Recent echocardiogram report', 1, 'echo within 6 months with EF noted'),
    ('Cardiology', 'lab', 'Recent ECG (within 3 months)', 1, '12-lead ECG'),
    ('Cardiology', 'lab', 'Lipid panel (within 12 months)', 0, 'total cholesterol, LDL, HDL, triglycerides'),
    ('Cardiology', 'imaging', 'Stress test if available', 0, 'exercise treadmill test or nuclear stress');

-- Clinic form variants
INSERT INTO clinic_form_variants (clinic_id, specialty, form_field_name, label, required, field_order) VALUES
    -- Toronto General (clinic 1) Pulmonology form
    (1, 'Pulmonology', 'patient_name', 'Patient Full Name', 1, 1),
    (1, 'Pulmonology', 'patient_dob', 'Date of Birth', 1, 2),
    (1, 'Pulmonology', 'patient_gender', 'Gender', 1, 3),
    (1, 'Pulmonology', 'referring_physician', 'Referring Physician', 1, 4),
    (1, 'Pulmonology', 'diagnosis', 'Diagnosis / ICD-10', 1, 5),
    (1, 'Pulmonology', 'current_medications', 'Current Medications', 1, 6),
    (1, 'Pulmonology', 'fev1', 'FEV1 (%)', 1, 7),
    (1, 'Pulmonology', 'fev1_fvc', 'FEV1/FVC Ratio', 1, 8),
    (1, 'Pulmonology', 'peak_flow', 'Peak Flow (L/min)', 0, 9),
    (1, 'Pulmonology', 'exacerbation_frequency', 'Exacerbation Frequency', 1, 10),
    (1, 'Pulmonology', 'triggers', 'Known Triggers', 0, 11),
    (1, 'Pulmonology', 'urgency', 'Referral Urgency', 1, 12),
    -- North York (clinic 2) Dermatology form (different field labels vs clinic 1)
    (2, 'Dermatology', 'patient_name', 'Full Name', 1, 1),
    (2, 'Dermatology', 'patient_dob', 'Birth Date', 1, 2),
    (2, 'Dermatology', 'patient_gender', 'Sex', 1, 3),
    (2, 'Dermatology', 'referring_physician', 'Requesting Physician', 1, 4),
    (2, 'Dermatology', 'diagnosis', 'Primary Diagnosis', 1, 5),
    (2, 'Dermatology', 'acne_duration', 'Duration of Condition (months)', 1, 6),
    (2, 'Dermatology', 'prior_treatments', 'Previous Treatments & Outcomes', 1, 7),
    (2, 'Dermatology', 'severity', 'Severity (Mild/Moderate/Severe)', 1, 8),
    (2, 'Dermatology', 'lesion_type', 'Lesion Type', 0, 9),
    (2, 'Dermatology', 'scarring', 'Scarring Present (Y/N)', 0, 10),
    -- Midtown (clinic 3) Cardiology form
    (3, 'Cardiology', 'patient_name', 'Patient Name', 1, 1),
    (3, 'Cardiology', 'patient_dob', 'Date of Birth', 1, 2),
    (3, 'Cardiology', 'patient_gender', 'Gender', 1, 3),
    (3, 'Cardiology', 'referring_physician', 'GP / Internist Name', 1, 4),
    (3, 'Cardiology', 'diagnosis', 'Working Diagnosis', 1, 5),
    (3, 'Cardiology', 'ejection_fraction', 'Ejection Fraction (%)', 1, 6),
    (3, 'Cardiology', 'bp', 'Blood Pressure (systolic/diastolic)', 1, 7),
    (3, 'Cardiology', 'hr', 'Heart Rate', 0, 8),
    (3, 'Cardiology', 'cardiac_meds', 'Current Cardiac Medications', 1, 9),
    (3, 'Cardiology', 'symptoms', 'Symptom Description', 1, 10),
    (3, 'Cardiology', 'echo_date', 'Echo Report Date', 0, 11),
    (3, 'Cardiology', 'urgency', 'Referral Urgency', 1, 12);

-- Sample rejection log (proof of learning loop)
INSERT INTO referrals (patient_id, from_provider_id, target_specialty, target_specialist_id, reason, status, rejection_reason, rejection_timestamp) VALUES
    (1, 1, 'Pulmonology', 2, 'Advanced asthma management', 'rejected', 'Missing FEV1 value — spirometry required before referral accepted', '2024-05-20 10:00:00'),
    (2, 1, 'Dermatology', 6, 'Isotretinoin evaluation', 'rejected', 'No prior treatment record provided', '2024-05-22 14:30:00');

INSERT INTO rejection_log (referral_id, rejected_by_specialist_id, rejection_reason, field_missing, timestamp) VALUES
    (1, 2, 'Spirometry (FEV1) results not included', 'fev1', '2024-05-20 10:00:00'),
    (2, 6, 'Prior treatment history not documented', 'prior_treatments', '2024-05-22 14:30:00');

-- Scribe context (example audit trail entry)
INSERT INTO scribe_context (visit_id, raw_content, source_type, extracted_data, extraction_version, confidence_score, manually_verified) VALUES
    (1, 'Chief complaint: asthma follow-up. Patient has been on Fluticasone...', 'paste',
     '{"diagnosis": ["J45.0"], "medications": [{"name": "Fluticasone", "type": "controller"}], "test_results": {"FEV1": "72%"}, "symptoms": {"exacerbation_frequency": "2-3 per month"}}',
     'v1_regex', 0.92, 0);
