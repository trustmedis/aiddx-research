export type VignetteCategory = "common" | "ambiguous" | "emergent" | "rare";

export interface Vignette {
	id: number;
	category: VignetteCategory;
	content: string;
	patient_initials: string;
	created_at: string;
}

export interface Diagnosis {
	diagnosis: string;
	rationale: string;
	icd10Code?: string;
	likelihoodRank?: number;
	diagnosticTests?: string[];
	regionalConsiderations?: string;
}

export interface LLMOutput {
	id: number;
	vignette_id: number;
	diagnoses: Diagnosis[]; // Array of 5 diagnoses
	model_name: string;
	temperature: number;
	created_at: string;
}

export interface Evaluation {
	id?: number;
	rater_id: string;
	vignette_id: number;
	llm_output_id: number;
	relevance_score: number; // 1-5
	missing_critical: boolean;
	missing_diagnosis: string | null;
	safety_score: number; // 1-5
	acceptable: boolean;
	ordering_score: number; // 1-5
	confidence_level: number; // 1-5
	comment: string | null;
	created_at?: string;
}

export interface RaterProgress {
	rater_id: string;
	total_vignettes: number;
	completed_vignettes: number;
	completed_ids: number[];
}

export interface EvaluationFormData {
	relevance_score: number;
	missing_critical: boolean;
	missing_diagnosis: string;
	safety_score: number;
	acceptable: boolean;
	ordering_score: number;
	confidence_level: number;
	comment: string;
}

export type PracticeLocation = "hospital" | "clinic" | "puskesmas" | "home";

export type AIConcern =
	| "liability"
	| "risk"
	| "privacy"
	| "clinical_reasoning_inability"
	| "transparency_lack"
	| "other";

export interface RaterDemographics {
	id?: number;
	rater_id: string;
	years_of_practice: number;
	practice_location: PracticeLocation;
	ai_clinical_reasoning_confidence: number; // 1-5
	ai_safety_concern: number; // 1-5
	ai_decision_support_willingness: number; // 1-3
	ai_concerns: AIConcern[]; // Array of concerns
	phone_number: string | null; // Optional phone number for prize lottery
	created_at?: string;
}

export interface DemographicsFormData {
	years_of_practice: number;
	practice_location: PracticeLocation | "";
	ai_clinical_reasoning_confidence: number;
	ai_safety_concern: number;
	ai_decision_support_willingness: number;
	ai_concerns: AIConcern[];
	phone_number: string;
}
