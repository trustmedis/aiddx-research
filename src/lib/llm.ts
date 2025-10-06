import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { Diagnosis } from "~/types";

const PROMPT_TEMPLATE = `**Purpose:**
Generate a prioritized differential diagnosis based on SOAP (Subjective & Objective) findings, tailored to Indonesia's epidemiological, cultural, and healthcare landscape. The output will include **ICD-10** codes for each diagnosis.

---

## Input:
- **Subjective Data:** Patient-reported symptoms (e.g., duration, severity, associated factors).
- **Objective Data:** Clinician observations (vital signs, physical exam, lab/imaging results).
- **Additional Information (optional):** User-provided information (e.g., lab results, drugs, medications, previous illnesses).
---

## Output Requirements:

### 1. **Prioritization:**
Order diagnoses by likelihood, accounting for:
- **Regional Prevalence:** Prioritize diseases endemic to Indonesia (e.g., dengue, tuberculosis, typhoid, malaria, leptospirosis, diabetes, hypertension).
- **Demographics:** Consider age, gender, geographic location (e.g., malaria risk in Papua, dengue in urban Java), and socioeconomic factors (e.g., sanitation, nutrition).
- **Seasonality:** Note disease patterns (e.g., dengue peaks in rainy seasons).

### 2. **Diagnosis Format per Entry:**
- **Condition Name:** Medical term for the condition.
- **ICD-10 Code:** Include the most accurate and specific ICD-10 code for the condition.
- **Supporting Evidence:** Explicitly link SOAP findings to the diagnosis.
- **Diagnostic Tests:** Recommend locally accessible tests.
- **Regional Considerations:** Note cultural practices, healthcare access barriers, or environmental exposures.

### 3. **Missing Information Alert:**
Identify critical gaps in history or exams.

---

VIGNETTE:
{vignette}`;

// Zod schema for structured output matching example.ts
const DiagnosisSchema = z.object({
	differentialDiagnosis: z
		.array(
			z.object({
				condition: z.string().describe("The medical name of the condition."),
				icd10Code: z
					.string()
					.describe("The accurate ICD-10 code for the condition."),
				supportingEvidence: z
					.string()
					.describe("Key findings from SOAP data that support the diagnosis."),
				likelihoodRank: z
					.number()
					.describe(
						"Numerical rank, 1 being the most likely. Ensure ranks are consecutive starting from 1.",
					),
				diagnosticTests: z
					.array(z.string())
					.describe("Recommended diagnostic tests for the condition."),
				regionalConsiderations: z
					.string()
					.describe("Regional or cultural factors influencing the diagnosis."),
			}),
		)
		.min(1)
		.max(5)
		.describe("Array of differential diagnoses, ranked by likelihood"),
	missingInformation: z
		.array(z.string())
		.describe("Critical gaps in patient history or examination.")
		.optional(),
});

export interface GenerateDiagnosesParams {
	vignette: string;
	temperature?: number;
	modelName?: string;
	apiKey: string;
}

export async function generateDifferentialDiagnoses(
	params: GenerateDiagnosesParams,
): Promise<Diagnosis[]> {
	const {
		vignette,
		temperature = 0.1,
		modelName = "openai/gpt-4o",
		apiKey,
	} = params;

	const prompt = PROMPT_TEMPLATE.replace("{vignette}", vignette);

	// Create OpenRouter client
	const openrouter = createOpenAI({
		apiKey,
		baseURL: "https://openrouter.ai/api/v1",
	});

	const { object } = await generateObject({
		model: openrouter.chat(modelName),
		prompt,
		schema: DiagnosisSchema,
		temperature,
	});

	// Map the detailed schema back to the Diagnosis[] format
	return object.differentialDiagnosis.map((dx) => ({
		diagnosis: dx.condition,
		rationale: dx.supportingEvidence,
		icd10Code: dx.icd10Code,
		likelihoodRank: dx.likelihoodRank,
		diagnosticTests: dx.diagnosticTests,
		regionalConsiderations: dx.regionalConsiderations,
	}));
}
