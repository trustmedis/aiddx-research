import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
	getRaterProgress,
	getVignettesWithOutputs,
	submitEvaluation,
	submitRaterDemographics,
} from "~/server/functions";
import type {
	AIConcern,
	DemographicsFormData,
	EvaluationFormData,
	LLMOutput,
	PracticeLocation,
	Vignette,
} from "~/types";

export const Route = createFileRoute("/evaluate/survey")({
	component: SurveyPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			raterId: (search.raterId as string) || "",
		};
	},
});

function SurveyPage() {
	const { raterId } = Route.useSearch();
	const [loading, setLoading] = useState(true);
	const [vignettes, setVignettes] = useState<
		Array<{
			vignette: Vignette;
			llmOutput: LLMOutput | null;
		}>
	>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [completedIds, setCompletedIds] = useState<number[]>([]);
	const [formData, setFormData] = useState<EvaluationFormData>({
		relevance_score: 0,
		missing_critical: false,
		missing_diagnosis: "",
		safety_score: 0,
		acceptable: false,
		ordering_score: 0,
		confidence_level: 0,
		comment: "",
	});
	const [submitting, setSubmitting] = useState(false);
	const [showDemographics, setShowDemographics] = useState(false);
	const [demographicsData, setDemographicsData] =
		useState<DemographicsFormData>({
			years_of_practice: 0,
			practice_location: "",
			ai_clinical_reasoning_confidence: 0,
			ai_safety_concern: 0,
			ai_decision_support_willingness: 0,
			ai_concerns: [],
			phone_number: "",
		});
	const [demographicsSubmitting, setDemographicsSubmitting] = useState(false);

	const loadData = useCallback(async () => {
		try {
			const [vignettesData, progress] = await Promise.all([
				getVignettesWithOutputs(),
				getRaterProgress({ data: { raterId } }),
			]);

			setVignettes(vignettesData);
			setCompletedIds(progress.completed_ids);

			// Find first uncompleted vignette
			const firstUncompleted = vignettesData.findIndex(
				(v) => !progress.completed_ids.includes(v.vignette.id),
			);
			if (firstUncompleted >= 0) {
				setCurrentIndex(firstUncompleted);
			}
		} catch (error) {
			console.error("Failed to load data:", error);
		} finally {
			setLoading(false);
		}
	}, [raterId]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const resetForm = () => {
		setFormData({
			relevance_score: 0,
			missing_critical: false,
			missing_diagnosis: "",
			safety_score: 0,
			acceptable: false,
			ordering_score: 0,
			confidence_level: 0,
			comment: "",
		});
	};

	const handleSubmit = async () => {
		const current = vignettes[currentIndex];
		if (!current || !current.llmOutput) return;

		// Validation
		if (formData.relevance_score === 0) {
			alert("Mohon beri nilai relevansi");
			return;
		}
		if (formData.safety_score === 0) {
			alert("Mohon beri nilai kekhawatiran keamanan");
			return;
		}
		if (formData.ordering_score === 0) {
			alert("Mohon beri nilai urutan diagnosis");
			return;
		}
		if (formData.confidence_level === 0) {
			alert("Mohon beri nilai tingkat kepercayaan diri Anda");
			return;
		}

		setSubmitting(true);

		try {
			await submitEvaluation({
				data: {
					rater_id: raterId,
					vignette_id: current.vignette.id,
					llm_output_id: current.llmOutput.id,
					relevance_score: formData.relevance_score,
					missing_critical: formData.missing_critical,
					missing_diagnosis: formData.missing_diagnosis || null,
					safety_score: formData.safety_score,
					acceptable: formData.acceptable,
					ordering_score: formData.ordering_score,
					confidence_level: formData.confidence_level,
					comment: formData.comment || null,
				},
			});

			// Update completed list
			setCompletedIds([...completedIds, current.vignette.id]);

			// Move to next or show completion
			const nextUncompleted = vignettes.findIndex(
				(v, idx) =>
					idx > currentIndex &&
					!completedIds.includes(v.vignette.id) &&
					v.vignette.id !== current.vignette.id,
			);

			resetForm();

			if (nextUncompleted >= 0) {
				setCurrentIndex(nextUncompleted);
			} else {
				// All vignettes done - show demographics form
				setShowDemographics(true);
			}

			// Scroll to top of page
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (error) {
			alert("Gagal mengirim evaluasi. Silakan coba lagi.");
			console.error(error);
		} finally {
			setSubmitting(false);
		}
	};

	const handlePrevious = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
			resetForm();
		}
	};

	const handleNext = () => {
		if (currentIndex < vignettes.length - 1) {
			setCurrentIndex(currentIndex + 1);
			resetForm();
		} else if (currentIndex === vignettes.length - 1) {
			// On last vignette, proceed to demographics
			setShowDemographics(true);
		}
	};

	const handleDemographicsSubmit = async () => {
		// Validation
		if (demographicsData.years_of_practice <= 0) {
			alert("Mohon masukkan lama praktik yang valid");
			return;
		}
		if (!demographicsData.practice_location) {
			alert("Mohon pilih tempat praktik utama");
			return;
		}
		if (demographicsData.ai_clinical_reasoning_confidence === 0) {
			alert("Mohon jawab pertanyaan tentang kepercayaan terhadap AI");
			return;
		}
		if (demographicsData.ai_safety_concern === 0) {
			alert("Mohon jawab pertanyaan tentang kekhawatiran keamanan AI");
			return;
		}
		if (demographicsData.ai_decision_support_willingness === 0) {
			alert("Mohon jawab pertanyaan tentang kesediaan menggunakan AI");
			return;
		}

		setDemographicsSubmitting(true);

		try {
			await submitRaterDemographics({
				data: {
					rater_id: raterId,
					years_of_practice: demographicsData.years_of_practice,
					practice_location: demographicsData.practice_location as PracticeLocation,
					ai_clinical_reasoning_confidence:
						demographicsData.ai_clinical_reasoning_confidence,
					ai_safety_concern: demographicsData.ai_safety_concern,
					ai_decision_support_willingness:
						demographicsData.ai_decision_support_willingness,
					ai_concerns: demographicsData.ai_concerns,
					phone_number: demographicsData.phone_number || null,
				},
			});

			// Show final completion
			setShowDemographics(false);
			setCurrentIndex(vignettes.length);
		} catch (error) {
			alert("Gagal mengirim data demografi. Silakan coba lagi.");
			console.error(error);
		} finally {
			setDemographicsSubmitting(false);
		}
	};

	const toggleAIConcern = (concern: AIConcern) => {
		setDemographicsData((prev) => ({
			...prev,
			ai_concerns: prev.ai_concerns.includes(concern)
				? prev.ai_concerns.filter((c) => c !== concern)
				: [...prev.ai_concerns, concern],
		}));
	};


	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<p className="text-lg">Memuat vignette...</p>
			</div>
		);
	}

	if (vignettes.length === 0) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-lg">Tidak ada vignette tersedia.</p>
					<p className="text-sm text-gray-600 mt-2">
						Silakan hubungi administrator studi.
					</p>
				</div>
			</div>
		);
	}

	// Demographics form screen
	if (showDemographics) {
		return (
			<div className="min-h-screen bg-gray-50 py-8 px-4">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white rounded-lg shadow-md p-6 mb-6">
						<h1 className="text-3xl font-bold mb-6 text-blue-600">
							Pertanyaan Tambahan
						</h1>
						<p className="text-gray-700 mb-6">
							Sebelum menyelesaikan survei, mohon jawab beberapa pertanyaan
							berikut:
						</p>

						<div className="space-y-6">
							{/* Question 1: Years of Practice */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									1. Berapa lama Anda telah berpraktik sebagai dokter? (dalam tahun)
								</label>
								<input
									type="number"
									min="0"
									value={demographicsData.years_of_practice || ""}
									onChange={(e) =>
										setDemographicsData({
											...demographicsData,
											years_of_practice: Number.parseInt(e.target.value) || 0,
										})
									}
									className="w-full md:w-1/3 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Contoh: 5"
								/>
							</div>

							{/* Question 2: Practice Location */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									2. Di mana Anda terutama berpraktik?
								</label>
								<div className="flex flex-wrap gap-3">
									{[
										["hospital", "Rumah Sakit"],
										["clinic", "Klinik"],
										["puskesmas", "Puskesmas"],
										["home", "Praktik Mandiri"],
									].map(([value, label]) => (
										<label
											key={value}
											className="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="radio"
												name="practice_location"
												value={value}
												checked={demographicsData.practice_location === value}
												onChange={() =>
													setDemographicsData({
														...demographicsData,
														practice_location: value as PracticeLocation,
													})
												}
												className="w-5 h-5"
											/>
											<span className="text-base">{label}</span>
										</label>
									))}
								</div>
							</div>

							{/* Question 3a: AI Clinical Reasoning Confidence */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									3a. Secara umum, saya yakin diagnosis diferensial berbasis AI ini cukup mampu melakukan clinical reasoning.
								</label>
								<div className="flex flex-wrap gap-3">
									{[
										[1, "Sangat tidak setuju"],
										[2, "Tidak setuju"],
										[3, "Ragu-ragu"],
										[4, "Setuju"],
										[5, "Sangat setuju"],
									].map(([score, label]) => (
										<label
											key={score}
											className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="radio"
												name="ai_clinical_reasoning"
												value={score}
												checked={
													demographicsData.ai_clinical_reasoning_confidence ===
													score
												}
												onChange={() =>
													setDemographicsData({
														...demographicsData,
														ai_clinical_reasoning_confidence: score as number,
													})
												}
												className="w-5 h-5"
											/>
											<span className="text-base">{label}</span>
										</label>
									))}
								</div>
							</div>

							{/* Question 3b: AI Safety Concern */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									3b. Saya khawatir penggunaan AI dalam diagnosis diferensial dapat membahayakan pasien.
								</label>
								<div className="flex flex-wrap gap-3">
									{[
										[1, "Sangat tidak setuju"],
										[2, "Tidak setuju"],
										[3, "Ragu-ragu"],
										[4, "Setuju"],
										[5, "Sangat setuju"],
									].map(([score, label]) => (
										<label
											key={score}
											className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="radio"
												name="ai_safety"
												value={score}
												checked={demographicsData.ai_safety_concern === score}
												onChange={() =>
													setDemographicsData({
														...demographicsData,
														ai_safety_concern: score as number,
													})
												}
												className="w-5 h-5"
											/>
											<span className="text-base">{label}</span>
										</label>
									))}
								</div>
							</div>

							{/* Question 3c: AI Decision Support Willingness */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									3c. Saya bersedia untuk menggunakan AI untuk decision support system dalam diagnosa klinis saya.
								</label>
								<div className="flex flex-wrap gap-3">
									{[
										[1, "Tidak mau"],
										[2, "Ragu-ragu"],
										[3, "Mau"],
									].map(([score, label]) => (
										<label
											key={score}
											className="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="radio"
												name="ai_willingness"
												value={score}
												checked={
													demographicsData.ai_decision_support_willingness ===
													score
												}
												onChange={() =>
													setDemographicsData({
														...demographicsData,
														ai_decision_support_willingness: score as number,
													})
												}
												className="w-5 h-5"
											/>
											<span className="text-base">{label}</span>
										</label>
									))}
								</div>
							</div>

							{/* Question 3d: AI Concerns */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									3d. Apa yang Anda khawatirkan tentang penggunaan AI dalam penegakan diagnosis klinis? (pilih semua yang sesuai)
								</label>
								<div className="space-y-2">
									{[
										["liability", "Liability (siapa yang bertanggung jawab)"],
										["risk", "Risiko"],
										["privacy", "Privasi pasien"],
										[
											"clinical_reasoning_inability",
											"Ketidakmampuan clinical reasoning",
										],
										[
											"transparency_lack",
											"Kurangnya transparansi clinical reasoning",
										],
										["other", "Lain-lain"],
									].map(([value, label]) => (
										<label
											key={value}
											className="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="checkbox"
												checked={demographicsData.ai_concerns.includes(
													value as AIConcern,
												)}
												onChange={() => toggleAIConcern(value as AIConcern)}
												className="w-5 h-5"
											/>
											<span className="text-base">{label}</span>
										</label>
									))}
								</div>
							</div>

							{/* Optional: Phone Number for Prize Lottery */}
							<div className="bg-blue-50 p-4 rounded border border-blue-200">
								<label className="block font-medium mb-3">
									4. Nomor Telepon (Opsional - untuk undian hadiah)
								</label>
								<input
									type="tel"
									value={demographicsData.phone_number}
									onChange={(e) =>
										setDemographicsData({
											...demographicsData,
											phone_number: e.target.value,
										})
									}
									className="w-full md:w-2/3 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Contoh: 081234567890"
								/>
								<p className="text-sm text-gray-600 mt-2">
									Nomor telepon Anda akan digunakan untuk undian hadiah dan tidak akan dibagikan kepada pihak ketiga.
								</p>
							</div>
						</div>

						<div className="flex justify-end mt-8 pt-6 border-t">
							<Button
								onClick={handleDemographicsSubmit}
								disabled={demographicsSubmitting}
								className="px-8"
							>
								{demographicsSubmitting ? "Menyimpan..." : "Selesai"}
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Final completion screen
	if (currentIndex >= vignettes.length) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-2xl bg-white rounded-lg shadow-md p-2 text-center">
					<h1 className="text-3xl font-bold mb-4 text-green-600">
						Evaluasi Selesai!
					</h1>
					<p className="text-lg mb-6">
						Terima kasih telah menyelesaikan semua {vignettes.length} evaluasi
						vignette.
					</p>
					<p className="text-gray-700 mb-4">
						Tanggapan Anda telah tercatat. Anda dapat menutup jendela ini
						sekarang.
					</p>
					<div className="text-sm text-gray-600">
						ID Penilai: <strong>{raterId}</strong>
					</div>
				</div>
			</div>
		);
	}

	const current = vignettes[currentIndex];
	const isCompleted = completedIds.includes(current.vignette.id);

	return (
		<div className="min-h-screen bg-gray-50 py-8 px-4">
			<div className="max-w-4xl mx-auto">
				{/* Progress */}
				<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
					<div className="flex justify-between items-center mb-2">
						<span className="text-sm font-medium">
							Progres: {completedIds.length} dari {vignettes.length} selesai
						</span>
						<span className="text-sm text-gray-600">ID Penilai: {raterId}</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className="bg-blue-600 h-2 rounded-full transition-all"
							style={{
								width: `${(completedIds.length / vignettes.length) * 100}%`,
							}}
						/>
					</div>
				</div>

				{/* Current Vignette */}
				<div className="bg-white rounded-lg shadow-md p-2 mb-6">
					<div className="flex justify-between items-start mb-6">
						<h2 className="text-2xl font-bold">
							Kasus {currentIndex + 1} dari {vignettes.length}
						</h2>
						<span
							className={`px-3 py-1 rounded text-sm font-medium ${current.vignette.category === "common"
								? "bg-blue-100 text-blue-800"
								: current.vignette.category === "ambiguous"
									? "bg-yellow-100 text-yellow-800"
									: current.vignette.category === "emergent"
										? "bg-red-100 text-red-800"
										: "bg-purple-100 text-purple-800"
								}`}
						>
							{current.vignette.category === "common"
								? "Umum"
								: current.vignette.category === "ambiguous"
									? "Ambigu"
									: current.vignette.category === "emergent"
										? "Emergensi"
										: "Langka"}
						</span>
					</div>

					<div className="mb-6">
						<h3 className="font-semibold mb-2">Vignette Pasien:</h3>
						<div className="bg-gray-50 p-4 rounded border">
							<p className="text-gray-800 whitespace-pre-wrap">
								{current.vignette.content}
							</p>
						</div>
					</div>

					{current.llmOutput ? (
						<div className="mb-6">
							<h3 className="font-semibold mb-2">
								Diagnosis Diferensial yang Dihasilkan AI:
							</h3>
							<div className="bg-blue-50 p-4 rounded border border-blue-200">
								<ol className="space-y-3">
									{current.llmOutput.diagnoses.map((d, idx) => (
										<li key={idx.toString()} className="flex">
											<span className="font-semibold mr-2">{idx + 1}.</span>
											<div>
												<div className="font-medium">{d.diagnosis}</div>
												<div className="flex grid md:grid-cols-2 gap-2 grid-rows auto-rows-fr">
													<div className="rounded text-sm text-gray-700 flex md:flex-row flex-col gap-2 border border-sky-200 p-2">
														<div className="font-medium w-full md:w-1/3">
															Rasionalitas:
														</div>
														<div className="w-full md:w-2/3">{d.rationale}</div>
													</div>
													<div className="rounded text-sm text-gray-700 flex md:flex-row flex-col gap-2 border border-sky-200 p-2">
														<div className="font-medium w-full md:w-1/3">
															Pertimbangan Regional:
														</div>
														<div className="w-full md:w-2/3">
															{d.regionalConsiderations}
														</div>
													</div>
												</div>
											</div>
										</li>
									))}
								</ol>
								<div className="mt-3 text-xs text-gray-600">
									Model: {current.llmOutput.model_name}
								</div>
							</div>
						</div>
					) : (
						<div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
							<p className="text-yellow-800">
								Tidak ada output AI tersedia untuk vignette ini.
							</p>
						</div>
					)}

					{isCompleted && (
						<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
							<p className="text-green-800 font-medium">
								✓ Anda telah mengevaluasi vignette ini.
							</p>
						</div>
					)}
				</div>

				{/* Evaluation Form */}
				{!isCompleted && current.llmOutput && (
					<div className="bg-white rounded-lg shadow-md p-2 mb-6">
						<h3 className="text-xl font-bold mb-6">Pertanyaan Evaluasi</h3>
						<div className="space-y-3">
							{/* Question 1: Relevance */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									1. Pada skala 1-5, seberapa relevan diagnosis diferensial yang dihasilkan?
								</label>
								<div className="flex flex-wrap gap-3">
									{[[1, "Sangat tidak relevan"], [2, "Tidak relevan"], [3, "Sedikit relevan"], [4, "Relevan"], [5, "Sangat relevan"]].map(([score, label]) => (
										<label
											key={score}
											className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="radio"
												name="relevance"
												value={score}
												checked={formData.relevance_score === score}
												onChange={() =>
													setFormData({ ...formData, relevance_score: score as number })
												}
												className="w-5 h-5"
											/>
											<span className="text-base">{label}</span>
										</label>
									))}
								</div>
								<p className="text-sm text-gray-600 mt-1">
									1 = Tidak relevan | 5 = Sangat relevan
								</p>
							</div>

							{/* Question 2: Missing Critical */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									2. Apakah ada diagnosis penting yang terlewat?
								</label>
								<div className="space-y-2">
									<div className="flex flex-wrap gap-3">
										<label className="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded hover:bg-gray-100 transition-colors">
											<input
												type="radio"
												name="missing_critical"
												checked={!formData.missing_critical}
												onChange={() =>
													setFormData({
														...formData,
														missing_critical: false,
														missing_diagnosis: "",
													})
												}
												className="w-5 h-5"
											/>
											<span className="text-base">Tidak</span>
										</label>
										<label className="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded hover:bg-gray-100 transition-colors">
											<input
												type="radio"
												name="missing_critical"
												checked={formData.missing_critical}
												onChange={() =>
													setFormData({ ...formData, missing_critical: true })
												}
												className="w-5 h-5"
											/>
											<span className="text-base">Ya</span>
										</label>
									</div>
									{formData.missing_critical && (
										<div className="mt-2">
											<label className="block text-sm font-medium mb-1">
												Jika ya, sebutkan diagnosis yang terlewat:
											</label>
											<Textarea
												value={formData.missing_diagnosis}
												onChange={(e) =>
													setFormData({
														...formData,
														missing_diagnosis: e.target.value,
													})
												}
												placeholder="Masukkan diagnosis yang terlewat..."
												className="max-w-md"
											/>
										</div>
									)}
								</div>
							</div>

							{/* Question 3: Safety */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									3. Seberapa aman daftar diagnosis ini untuk digunakan pada pasien?
								</label>
								<div className="flex flex-wrap gap-3">
									{[[1, "Sangat tidak aman"], [2, "Tidak aman"], [3, "Cukup aman"], [4, "Aman"], [5, "Sangat aman"]].map(([score, label]) => (
										<label
											key={score}
											className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="radio"
												name="safety"
												value={score}
												checked={formData.safety_score === score}
												onChange={() =>
													setFormData({ ...formData, safety_score: score as number })
												}
												className="w-5 h-5"
											/>
											<span className="text-base">{label}</span>
										</label>
									))}
								</div>
							</div>

							{/* Question 4: Acceptable */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									4. Apakah Anda menganggap diferensial diagnosis ini dapat digunakan dalam praktik klinis?
								</label>
								<div className="flex flex-wrap gap-3">
									<label className="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded hover:bg-gray-100 transition-colors">
										<input
											type="radio"
											name="acceptable"
											checked={formData.acceptable}
											onChange={() =>
												setFormData({ ...formData, acceptable: true })
											}
											className="w-5 h-5"
										/>
										<span className="text-base">Ya</span>
									</label>
									<label className="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded hover:bg-gray-100 transition-colors">
										<input
											type="radio"
											name="acceptable"
											checked={!formData.acceptable}
											onChange={() =>
												setFormData({ ...formData, acceptable: false })
											}
											className="w-5 h-5"
										/>
										<span className="text-base">Tidak</span>
									</label>
								</div>
							</div>

							{/* Question 5: Ordering Appropriateness */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									5. Seberapa tepat urutan diagnosis diferensial
									(dari yang paling tidak mungkin hingga yang paling mungkin)?
								</label>
								<div className="flex flex-wrap gap-3">
									{[1, 2, 3, 4, 5].map((score) => (
										<label
											key={score}
											className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="radio"
												name="ordering"
												value={score}
												checked={formData.ordering_score === score}
												onChange={() =>
													setFormData({ ...formData, ordering_score: score })
												}
												className="w-5 h-5"
											/>
											<span className="text-base">{score}</span>
										</label>
									))}
								</div>
								<p className="text-sm text-gray-600 mt-1">
									1 = Tidak mungkin | 5 = Sangat mungkin
								</p>
							</div>

							{/* Question 6: Confidence Level */}
							<div className="bg-gray-50 p-4 rounded border">
								<label className="block font-medium mb-3">
									6. Seberapa yakin Anda dengan evaluasi Anda?
								</label>
								<div className="flex flex-wrap gap-3">
									{[[1, "Tidak yakin"], [2, "Sedikit yakin"], [3, "Ragu-ragu"], [4, "Yakin"], [5, "Sangat yakin"]].map(([score, label]) => (
										<label
											key={score}
											className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded hover:bg-gray-100 transition-colors"
										>
											<input
												type="radio"
												name="confidence"
												value={score}
												checked={formData.confidence_level === score}
												onChange={() =>
													setFormData({ ...formData, confidence_level: score as number })
												}
												className="w-5 h-5"
											/>
											<span className="text-base">{label}</span>
										</label>
									))}
								</div>
							</div>

							{/* Optional Comment */}
							<div>
								<label className="block font-medium mb-2">
									7. Komentar opsional:
								</label>
								<Textarea
									value={formData.comment}
									onChange={(e) =>
										setFormData({ ...formData, comment: e.target.value })
									}
									placeholder="Komentar atau masukan tambahan..."
									className="w-full"
								/>
							</div>
						</div>

						<div className="flex justify-between mt-8 pt-6 border-t">
							<Button
								onClick={handlePrevious}
								disabled={currentIndex === 0}
								variant="outline"
							>
								Sebelumnya
							</Button>

							<Button
								onClick={handleSubmit}
								disabled={submitting}
								className="px-8"
							>
								{submitting ? "Menyimpan..." : "Simpan & Lanjut"}
							</Button>
						</div>
					</div>
				)}

				{/* Navigation for already completed */}
				{isCompleted && (
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex justify-between">
							<Button
								onClick={handlePrevious}
								disabled={currentIndex === 0}
								variant="outline"
							>
								Sebelumnya
							</Button>
							<Button onClick={handleNext}>
								{currentIndex === vignettes.length - 1
									? "Lanjut ke Kuesioner"
									: "Selanjutnya"}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
