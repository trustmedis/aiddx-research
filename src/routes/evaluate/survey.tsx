import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
	getRaterProgress,
	getVignettesWithOutputs,
	submitEvaluation,
} from "~/server/functions";
import type { EvaluationFormData, LLMOutput, Vignette } from "~/types";

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
				// All done
				setCurrentIndex(vignettes.length);
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
		}
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

	// Completion screen
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
							<Button
								onClick={handleNext}
								disabled={currentIndex === vignettes.length - 1}
							>
								Selanjutnya
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
