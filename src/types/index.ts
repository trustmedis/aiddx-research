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
