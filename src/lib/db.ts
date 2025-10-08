import type {
	Diagnosis,
	Evaluation,
	LLMOutput,
	RaterDemographics,
	RaterProgress,
	Vignette,
} from "~/types";

export class Database {
	constructor(private db: D1Database) {}

	// Vignettes
	async getAllVignettes(): Promise<Vignette[]> {
		const { results } = await this.db
			.prepare("SELECT * FROM vignettes ORDER BY category, id")
			.all<Vignette>();
		return results || [];
	}

	async getVignetteById(id: number): Promise<Vignette | null> {
		return await this.db
			.prepare("SELECT * FROM vignettes WHERE id = ?")
			.bind(id)
			.first<Vignette>();
	}

	async getVignettesByCategory(category: string): Promise<Vignette[]> {
		const { results } = await this.db
			.prepare("SELECT * FROM vignettes WHERE category = ? ORDER BY id")
			.bind(category)
			.all<Vignette>();
		return results || [];
	}

	async createVignette(
		category: string,
		patientInitials: string,
		content: string,
	): Promise<number> {
		const result = await this.db
			.prepare(
				"INSERT INTO vignettes (category, patient_initials, content) VALUES (?, ?, ?)",
			)
			.bind(category, patientInitials, content)
			.run();
		return result.meta.last_row_id as number;
	}

	async updateVignette(
		id: number,
		category: string,
		patientInitials: string,
		content: string,
	): Promise<void> {
		await this.db
			.prepare(
				"UPDATE vignettes SET category = ?, patient_initials = ?, content = ? WHERE id = ?",
			)
			.bind(category, patientInitials, content, id)
			.run();
	}

	async deleteVignette(id: number): Promise<void> {
		// Delete related evaluations first
		await this.db
			.prepare("DELETE FROM evaluations WHERE vignette_id = ?")
			.bind(id)
			.run();

		// Delete related LLM outputs
		await this.db
			.prepare("DELETE FROM llm_outputs WHERE vignette_id = ?")
			.bind(id)
			.run();

		// Delete the vignette
		await this.db.prepare("DELETE FROM vignettes WHERE id = ?").bind(id).run();
	}

	async getVignetteWithStats(id: number): Promise<{
		vignette: Vignette | null;
		evaluationCount: number;
		hasLLMOutput: boolean;
	}> {
		const vignette = await this.getVignetteById(id);
		if (!vignette) {
			return { vignette: null, evaluationCount: 0, hasLLMOutput: false };
		}

		const evalCount = await this.db
			.prepare(
				"SELECT COUNT(*) as count FROM evaluations WHERE vignette_id = ?",
			)
			.bind(id)
			.first<{ count: number }>();

		const llmOutput = await this.getLLMOutputByVignetteId(id);

		return {
			vignette,
			evaluationCount: evalCount?.count || 0,
			hasLLMOutput: llmOutput !== null,
		};
	}

	// LLM Outputs
	async saveLLMOutput(
		vignetteId: number,
		diagnoses: Diagnosis[],
		modelName: string,
		temperature: number,
	): Promise<number> {
		const result = await this.db
			.prepare(
				"INSERT INTO llm_outputs (vignette_id, diagnoses, model_name, temperature) VALUES (?, ?, ?, ?)",
			)
			.bind(vignetteId, JSON.stringify(diagnoses), modelName, temperature)
			.run();
		return result.meta.last_row_id as number;
	}

	async getLLMOutputByVignetteId(
		vignetteId: number,
	): Promise<LLMOutput | null> {
		const raw = await this.db
			.prepare(
				"SELECT * FROM llm_outputs WHERE vignette_id = ? ORDER BY created_at DESC LIMIT 1",
			)
			.bind(vignetteId)
			.first<Omit<LLMOutput, "diagnoses"> & { diagnoses: string }>();

		if (!raw) return null;

		return {
			...raw,
			diagnoses: JSON.parse(raw.diagnoses),
		};
	}

	async getAllLLMOutputs(): Promise<LLMOutput[]> {
		const { results } = await this.db
			.prepare("SELECT * FROM llm_outputs ORDER BY vignette_id")
			.all<Omit<LLMOutput, "diagnoses"> & { diagnoses: string }>();

		return (results || []).map((raw) => ({
			...raw,
			diagnoses: JSON.parse(raw.diagnoses),
		}));
	}

	// Evaluations
	async saveEvaluation(
		evaluation: Omit<Evaluation, "id" | "created_at">,
	): Promise<number> {
		const result = await this.db
			.prepare(
				`INSERT INTO evaluations
        (rater_id, vignette_id, llm_output_id, relevance_score, missing_critical, missing_diagnosis, safety_score, acceptable, ordering_score, confidence_level, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				evaluation.rater_id,
				evaluation.vignette_id,
				evaluation.llm_output_id,
				evaluation.relevance_score,
				evaluation.missing_critical ? 1 : 0,
				evaluation.missing_diagnosis,
				evaluation.safety_score,
				evaluation.acceptable ? 1 : 0,
				evaluation.ordering_score,
				evaluation.confidence_level,
				evaluation.comment,
			)
			.run();
		return result.meta.last_row_id as number;
	}

	async getEvaluationsByRater(raterId: string): Promise<Evaluation[]> {
		const { results } = await this.db
			.prepare(
				"SELECT * FROM evaluations WHERE rater_id = ? ORDER BY created_at",
			)
			.bind(raterId)
			.all<Evaluation>();
		return results || [];
	}

	async getRaterProgress(raterId: string): Promise<RaterProgress> {
		const totalVignettes = await this.db
			.prepare("SELECT COUNT(*) as count FROM vignettes")
			.first<{ count: number }>();

		const completedEvaluations = await this.db
			.prepare("SELECT vignette_id FROM evaluations WHERE rater_id = ?")
			.bind(raterId)
			.all<{ vignette_id: number }>();

		const completedIds = (completedEvaluations.results || []).map(
			(e) => e.vignette_id,
		);

		return {
			rater_id: raterId,
			total_vignettes: totalVignettes?.count || 0,
			completed_vignettes: completedIds.length,
			completed_ids: completedIds,
		};
	}

	async hasEvaluatedVignette(
		raterId: string,
		vignetteId: number,
	): Promise<boolean> {
		const result = await this.db
			.prepare(
				"SELECT id FROM evaluations WHERE rater_id = ? AND vignette_id = ? LIMIT 1",
			)
			.bind(raterId, vignetteId)
			.first();
		return result !== null;
	}

	// Rater Demographics
	async saveRaterDemographics(
		demographics: Omit<RaterDemographics, "id" | "created_at">,
	): Promise<number> {
		const result = await this.db
			.prepare(
				`INSERT INTO rater_demographics
        (rater_id, years_of_practice, practice_location, ai_clinical_reasoning_confidence, ai_safety_concern, ai_decision_support_willingness, ai_concerns, phone_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				demographics.rater_id,
				demographics.years_of_practice,
				demographics.practice_location,
				demographics.ai_clinical_reasoning_confidence,
				demographics.ai_safety_concern,
				demographics.ai_decision_support_willingness,
				JSON.stringify(demographics.ai_concerns),
				demographics.phone_number,
			)
			.run();
		return result.meta.last_row_id as number;
	}

	async getRaterDemographics(
		raterId: string,
	): Promise<RaterDemographics | null> {
		const raw = await this.db
			.prepare("SELECT * FROM rater_demographics WHERE rater_id = ? LIMIT 1")
			.bind(raterId)
			.first<Omit<RaterDemographics, "ai_concerns"> & { ai_concerns: string }>();

		if (!raw) return null;

		return {
			...raw,
			ai_concerns: JSON.parse(raw.ai_concerns),
		};
	}

	async hasSubmittedDemographics(raterId: string): Promise<boolean> {
		const result = await this.db
			.prepare("SELECT id FROM rater_demographics WHERE rater_id = ? LIMIT 1")
			.bind(raterId)
			.first();
		return result !== null;
	}
}
