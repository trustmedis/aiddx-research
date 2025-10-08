import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { Database } from "~/lib/db";
import { generateDifferentialDiagnoses } from "~/lib/llm";
import type {
	Evaluation,
	RaterDemographics,
	VignetteCategory,
} from "~/types";

// Default model configuration (can be overridden per-request)
export const modelName = "google/gemini-2.5-flash-preview-09-2025";
export const modelTemperature = 0.1;

// Generate diagnoses for a specific vignette
export const generateDiagnoses = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { vignetteId: number; apiKey?: string; modelName?: string }) =>
			data,
	)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);

		const vignette = await db.getVignetteById(data.vignetteId);
		if (!vignette) {
			throw new Error("Vignette not found");
		}

		// Check if already generated
		const existing = await db.getLLMOutputByVignetteId(data.vignetteId);
		if (existing) {
			return existing;
		}

		// Use provided API key or fall back to environment variable
		const apiKey = data.apiKey || env.OPENROUTER_API_KEY;
		if (!apiKey) {
			throw new Error("OpenRouter API key not provided");
		}

		// Use provided model name or fall back to default
		const selectedModel = data.modelName || modelName;

		// Generate using LLM
		const diagnoses = await generateDifferentialDiagnoses({
			vignette: vignette.content,
			apiKey,
			temperature: modelTemperature,
			modelName: selectedModel,
		});

		// Save to database
		const outputId = await db.saveLLMOutput(
			data.vignetteId,
			diagnoses,
			selectedModel,
			modelTemperature,
		);

		return {
			id: outputId,
			vignette_id: data.vignetteId,
			diagnoses,
			model_name: selectedModel,
			temperature: modelTemperature,
			created_at: new Date().toISOString(),
		};
	});

// Generate all diagnoses for all vignettes
export const generateAllDiagnoses = createServerFn({ method: "POST" })
	.inputValidator((data: { apiKey?: string }) => data)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);

		// Use provided API key or fall back to environment variable
		const apiKey = data.apiKey || env.OPENROUTER_API_KEY;
		if (!apiKey) {
			throw new Error("OpenRouter API key not provided");
		}

		const vignettes = await db.getAllVignettes();
		const results = [];

		for (const vignette of vignettes) {
			// Check if already generated
			let output = await db.getLLMOutputByVignetteId(vignette.id);

			if (!output) {
				// Generate using LLM
				const diagnoses = await generateDifferentialDiagnoses({
					vignette: vignette.content,
					apiKey,
					temperature: modelTemperature,
					modelName: modelName,
				});

				const outputId = await db.saveLLMOutput(
					vignette.id,
					diagnoses,
					modelName,
					modelTemperature,
				);

				output = {
					id: outputId,
					vignette_id: vignette.id,
					diagnoses,
					model_name: modelName,
					temperature: modelTemperature,
					created_at: new Date().toISOString(),
				};
			}

			results.push(output);
		}

		return results;
	});

// Get all vignettes with their LLM outputs
export const getVignettesWithOutputs = createServerFn({
	method: "GET",
}).handler(async () => {
	const db = new Database(env.DB);

	const vignettes = await db.getAllVignettes();
	const outputs = await db.getAllLLMOutputs();

	return vignettes.map((vignette) => ({
		vignette,
		llmOutput: outputs.find((o) => o.vignette_id === vignette.id) || null,
	}));
});

// Get rater progress
export const getRaterProgress = createServerFn({ method: "GET" })
	.inputValidator((data: { raterId: string }) => data)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);
		return await db.getRaterProgress(data.raterId);
	});

// Submit evaluation
export const submitEvaluation = createServerFn({ method: "POST" })
	.inputValidator((data: Omit<Evaluation, "id" | "created_at">) => data)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);

		// Check if already evaluated
		const alreadyEvaluated = await db.hasEvaluatedVignette(
			data.rater_id,
			data.vignette_id,
		);

		if (alreadyEvaluated) {
			throw new Error("This vignette has already been evaluated by this rater");
		}

		const evaluationId = await db.saveEvaluation(data);

		return {
			success: true,
			evaluationId,
		};
	});

// Get next vignette for rater
export const getNextVignette = createServerFn({ method: "GET" })
	.inputValidator((data: { raterId: string }) => data)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);

		const progress = await db.getRaterProgress(data.raterId);
		const vignettes = await db.getAllVignettes();

		// Find first vignette not yet evaluated
		const nextVignette = vignettes.find(
			(v) => !progress.completed_ids.includes(v.id),
		);

		if (!nextVignette) {
			return null;
		}

		// Get LLM output for this vignette
		const llmOutput = await db.getLLMOutputByVignetteId(nextVignette.id);

		return {
			vignette: nextVignette,
			llmOutput,
		};
	});

// Vignette Management
export const getAllVignettesWithStats = createServerFn({
	method: "GET",
}).handler(async () => {
	const db = new Database(env.DB);
	const vignettes = await db.getAllVignettes();

	const vignetteStats = await Promise.all(
		vignettes.map(async (vignette) => {
			const stats = await db.getVignetteWithStats(vignette.id);
			const llmOutput = await db.getLLMOutputByVignetteId(vignette.id);
			return {
				...vignette,
				evaluationCount: stats.evaluationCount,
				hasLLMOutput: stats.hasLLMOutput,
				llmDiagnoses: llmOutput?.diagnoses || null,
			};
		}),
	);

	return vignetteStats;
});

export const createVignette = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			category: VignetteCategory;
			patientInitials: string;
			content: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);

		const vignetteId = await db.createVignette(
			data.category,
			data.patientInitials,
			data.content,
		);

		return {
			success: true,
			vignetteId,
		};
	});

export const updateVignette = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id: number;
			category: VignetteCategory;
			patientInitials: string;
			content: string;
		}) => data,
	)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);

		await db.updateVignette(
			data.id,
			data.category,
			data.patientInitials,
			data.content,
		);

		return {
			success: true,
		};
	});

export const deleteVignette = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);

		// Get stats before deleting to warn user
		const stats = await db.getVignetteWithStats(data.id);

		await db.deleteVignette(data.id);

		return {
			success: true,
			deletedEvaluations: stats.evaluationCount,
			deletedLLMOutput: stats.hasLLMOutput,
		};
	});

// Validate admin password
export const validateAdminPassword = createServerFn({ method: "POST" })
	.inputValidator((data: { password: string }) => data)
	.handler(async ({ data }) => {
		const adminPassword = env.ADMIN_PASSWORD;

		if (!adminPassword) {
			throw new Error("Admin password not configured");
		}

		return {
			valid: data.password === adminPassword,
		};
	});

// Submit rater demographics
export const submitRaterDemographics = createServerFn({ method: "POST" })
	.inputValidator(
		(data: Omit<RaterDemographics, "id" | "created_at">) => data,
	)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);

		// Check if already submitted
		const alreadySubmitted = await db.hasSubmittedDemographics(data.rater_id);

		if (alreadySubmitted) {
			throw new Error(
				"Demographics have already been submitted by this rater",
			);
		}

		const demographicsId = await db.saveRaterDemographics(data);

		return {
			success: true,
			demographicsId,
		};
	});

// Get rater demographics
export const getRaterDemographicsData = createServerFn({ method: "GET" })
	.inputValidator((data: { raterId: string }) => data)
	.handler(async ({ data }) => {
		const db = new Database(env.DB);
		return await db.getRaterDemographics(data.raterId);
	});
