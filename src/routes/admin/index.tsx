import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import {
	createVignette,
	deleteVignette,
	generateDiagnoses,
	getAllVignettesWithStats,
	modelName,
	updateVignette,
	validateAdminPassword,
} from "~/server/functions";
import type { Diagnosis, VignetteCategory } from "~/types";

export const Route = createFileRoute("/admin/")({
	component: AdminPage,
});

interface VignetteWithStats {
	id: number;
	category: VignetteCategory;
	patient_initials: string;
	content: string;
	created_at: string;
	evaluationCount: number;
	hasLLMOutput: boolean;
	llmDiagnoses: Diagnosis[] | null;
}

function AdminPage() {
	// Authentication state
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [password, setPassword] = useState("");
	const [authError, setAuthError] = useState("");
	const [authenticating, setAuthenticating] = useState(false);

	const [activeTab, setActiveTab] = useState<"vignettes" | "llm">("vignettes");
	const [apiKey, setApiKey] = useState("");
	const [modelNameInput, setModelNameInput] = useState("");
	const [generating, setGenerating] = useState(false);
	const [status, setStatus] = useState<string>("");
	const [progress, setProgress] = useState({ current: 0, total: 0 });

	// Vignette management state
	const [vignettes, setVignettes] = useState<VignetteWithStats[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState({
		category: "common" as VignetteCategory,
		patientInitials: "",
		content: "",
	});

	// Check authentication on mount
	useEffect(() => {
		const authenticated = sessionStorage.getItem("admin_authenticated");
		if (authenticated === "true") {
			setIsAuthenticated(true);
		}
	}, []);

	// Handle login
	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setAuthenticating(true);
		setAuthError("");

		try {
			const result = await validateAdminPassword({
				data: { password },
			});

			if (result.valid) {
				setIsAuthenticated(true);
				sessionStorage.setItem("admin_authenticated", "true");
				setPassword("");
			} else {
				setAuthError("Kata sandi salah");
			}
		} catch (error) {
			console.error(error);
			setAuthError("Gagal memvalidasi kata sandi");
		} finally {
			setAuthenticating(false);
		}
	};

	// Handle logout
	const handleLogout = () => {
		setIsAuthenticated(false);
		sessionStorage.removeItem("admin_authenticated");
	};

	const loadVignettes = useCallback(async () => {
		try {
			setLoading(true);
			const data = await getAllVignettesWithStats();
			setVignettes(data);
		} catch (error) {
			console.error("Failed to load vignettes:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadVignettes();
	}, [loadVignettes]);

	const handleGenerate = async () => {
		setGenerating(true);
		setStatus("Starting generation...");

		// Find vignettes without LLM outputs
		const vignettesNeedingGeneration = vignettes.filter((v) => !v.hasLLMOutput);

		if (vignettesNeedingGeneration.length === 0) {
			setStatus("All vignettes already have LLM outputs");
			setGenerating(false);
			return;
		}

		setProgress({ current: 0, total: vignettesNeedingGeneration.length });

		try {
			for (let i = 0; i < vignettesNeedingGeneration.length; i++) {
				const vignette = vignettesNeedingGeneration[i];
				setStatus(
					`Generating for vignette ${vignette.id} (${i + 1}/${vignettesNeedingGeneration.length})...`,
				);

				await generateDiagnoses({
					data: {
						vignetteId: vignette.id,
						apiKey: apiKey.trim() || undefined,
						modelName: modelNameInput.trim() || undefined,
					},
				});

				setProgress({
					current: i + 1,
					total: vignettesNeedingGeneration.length,
				});
			}

			setStatus(
				`✓ Successfully generated ${vignettesNeedingGeneration.length} LLM outputs`,
			);
			await loadVignettes(); // Refresh to show updated stats
		} catch (error) {
			console.error(error);
			setStatus(`✗ Error: ${error}`);
		} finally {
			setGenerating(false);
			setProgress({ current: 0, total: 0 });
		}
	};

	const handleAddNew = () => {
		setEditingId(null);
		setFormData({
			category: "common",
			patientInitials: "",
			content: "",
		});
		setShowForm(true);
	};

	const handleEdit = (vignette: VignetteWithStats) => {
		setEditingId(vignette.id);
		setFormData({
			category: vignette.category,
			patientInitials: vignette.patient_initials,
			content: vignette.content,
		});
		setShowForm(true);
	};

	const handleDelete = async (vignette: VignetteWithStats) => {
		const confirmMsg =
			vignette.evaluationCount > 0
				? `This vignette has ${vignette.evaluationCount} evaluation(s). Deleting it will also delete all related evaluations and LLM outputs. Are you sure?`
				: "Are you sure you want to delete this vignette?";

		if (!confirm(confirmMsg)) return;

		try {
			await deleteVignette({ data: { id: vignette.id } });
			await loadVignettes();
			setStatus(`✓ Vignette deleted successfully`);
		} catch (error) {
			console.error(error);
			setStatus(`✗ Error deleting vignette: ${error}`);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.patientInitials.trim() || !formData.content.trim()) {
			alert("Please fill in all fields");
			return;
		}

		try {
			if (editingId) {
				await updateVignette({
					data: {
						id: editingId,
						category: formData.category,
						patientInitials: formData.patientInitials.trim(),
						content: formData.content.trim(),
					},
				});
				setStatus("✓ Vignette updated successfully");
			} else {
				await createVignette({
					data: {
						category: formData.category,
						patientInitials: formData.patientInitials.trim(),
						content: formData.content.trim(),
					},
				});
				setStatus("✓ Vignette created successfully");
			}

			setShowForm(false);
			await loadVignettes();
		} catch (error) {
			console.error(error);
			setStatus(`✗ Error: ${error}`);
		}
	};

	const getCategoryBadgeClass = (category: VignetteCategory) => {
		switch (category) {
			case "common":
				return "bg-blue-100 text-blue-800";
			case "ambiguous":
				return "bg-yellow-100 text-yellow-800";
			case "emergent":
				return "bg-red-100 text-red-800";
			case "rare":
				return "bg-purple-100 text-purple-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	// Show login form if not authenticated
	if (!isAuthenticated) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
				<div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
					<h1 className="text-3xl font-bold mb-6 text-center">Admin Login</h1>
					<form onSubmit={handleLogin} className="space-y-4">
						<div>
							<label className="block text-sm font-medium mb-2">
								Kata Sandi Admin
							</label>
							<Input
								type="password"
								placeholder="Masukkan kata sandi"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoFocus
							/>
						</div>
						{authError && (
							<div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
								{authError}
							</div>
						)}
						<Button
							type="submit"
							disabled={authenticating}
							className="w-full"
						>
							{authenticating ? "Memvalidasi..." : "Masuk"}
						</Button>
					</form>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 py-12 px-4">
			<div className="max-w-6xl mx-auto">
				<div className="bg-white rounded-lg shadow-md p-8">
					<div className="flex justify-between items-center mb-6">
						<h1 className="text-3xl font-bold">Panel Admin</h1>
						<Button onClick={handleLogout} variant="outline" size="sm">
							Keluar
						</Button>
					</div>

					{/* Tabs */}
					<div className="border-b mb-6">
						<div className="flex space-x-4">
							<button
								onClick={() => setActiveTab("vignettes")}
								className={`pb-2 px-1 ${activeTab === "vignettes"
									? "border-b-2 border-blue-600 text-blue-600 font-semibold"
									: "text-gray-600 hover:text-gray-800"
									}`}
							>
								Manajemen Vignette
							</button>
							<button
								onClick={() => setActiveTab("llm")}
								className={`pb-2 px-1 ${activeTab === "llm"
									? "border-b-2 border-blue-600 text-blue-600 font-semibold"
									: "text-gray-600 hover:text-gray-800"
									}`}
							>
								LLM Generation
							</button>
						</div>
					</div>

					{/* Vignette Management Tab */}
					{activeTab === "vignettes" && (
						<div className="space-y-6">
							<div className="flex justify-between items-center">
								<h2 className="text-xl font-semibold">
									Vignette ({vignettes.length})
								</h2>
								<Button onClick={handleAddNew}>Tambah Vignette Baru</Button>
							</div>

							{/* Add/Edit Form */}
							{showForm && (
								<div className="bg-gray-50 border rounded-lg p-6">
									<h3 className="text-lg font-semibold mb-4">
										{editingId ? "Edit Vignette" : "Tambah Vignette Baru"}
									</h3>
									<form onSubmit={handleSubmit} className="space-y-4">
										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="block text-sm font-medium mb-2">
													Kategori
												</label>
												<Select
													value={formData.category}
													onValueChange={(value: VignetteCategory) =>
														setFormData({ ...formData, category: value })
													}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="common">Umum</SelectItem>
														<SelectItem value="ambiguous">Ambigu</SelectItem>
														<SelectItem value="emergent">Emergensi</SelectItem>
														<SelectItem value="rare">Langka</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div>
												<label className="block text-sm font-medium mb-2">
													Inisial Pasien
												</label>
												<Input
													type="text"
													placeholder="contoh: J.S."
													value={formData.patientInitials}
													onChange={(e) =>
														setFormData({
															...formData,
															patientInitials: e.target.value,
														})
													}
													required
												/>
											</div>
										</div>
										<div>
											<label className="block text-sm font-medium mb-2">
												Konten Vignette
											</label>
											<Textarea
												placeholder="Masukkan vignette klinis..."
												value={formData.content}
												onChange={(e) =>
													setFormData({ ...formData, content: e.target.value })
												}
												rows={6}
												required
											/>
										</div>
										<div className="flex space-x-3">
											<Button type="submit">
												{editingId ? "Perbarui" : "Buat"}
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() => setShowForm(false)}
											>
												Batal
											</Button>
										</div>
									</form>
								</div>
							)}

							{/* Vignettes Table */}
							{loading ? (
								<p className="text-center text-gray-600">Memuat vignette...</p>
							) : (
								<div className="border rounded-lg overflow-hidden">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													ID
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Kategori
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Pasien
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Preview
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Eval
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													LLM
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Diagnosis
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
													Aksi
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{vignettes.map((vignette) => (
												<tr key={vignette.id} className="hover:bg-gray-50">
													<td className="px-4 py-3 text-sm">{vignette.id}</td>
													<td className="px-4 py-3">
														<span
															className={`px-2 py-1 text-xs font-medium rounded ${getCategoryBadgeClass(
																vignette.category,
															)}`}
														>
															{vignette.category}
														</span>
													</td>
													<td className="px-4 py-3 text-sm">
														{vignette.patient_initials}
													</td>
													<td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
														{vignette.content.substring(0, 100)}...
													</td>
													<td className="px-4 py-3 text-sm">
														{vignette.llmDiagnoses ? (
															<Dialog>
																<DialogTrigger asChild>
																	<button className="text-blue-600 hover:text-blue-800 text-sm underline">
																		View {vignette.llmDiagnoses.length}{" "}
																		Diagnosis
																		{vignette.llmDiagnoses.length > 1
																			? "es"
																			: ""}
																	</button>
																</DialogTrigger>
																<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
																	<DialogHeader>
																		<DialogTitle>
																			LLM Diagnoses for Vignette {vignette.id}
																		</DialogTitle>
																		<DialogDescription>
																			Patient: {vignette.patient_initials}
																		</DialogDescription>
																	</DialogHeader>
																	<div className="space-y-4">
																		{vignette.llmDiagnoses.map(
																			(diagnosis, index) => (
																				<div
																					key={`${diagnosis.diagnosis}-${diagnosis.icd10Code || index}`}
																					className="border rounded-lg p-4 bg-gray-50"
																				>
																					<div className="flex items-start justify-between mb-2">
																						<h3 className="font-semibold text-lg">
																							{index + 1}. {diagnosis.diagnosis}
																						</h3>
																						{diagnosis.icd10Code && (
																							<span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
																								{diagnosis.icd10Code}
																							</span>
																						)}
																					</div>
																					{diagnosis.likelihoodRank && (
																						<p className="text-sm text-gray-600 mb-2">
																							<strong>Likelihood Rank:</strong>{" "}
																							{diagnosis.likelihoodRank}/5
																						</p>
																					)}
																					{diagnosis.rationale && (
																						<div className="mb-2">
																							<strong>Rationale:</strong>
																							<p className="text-sm text-gray-700 mt-1">
																								{diagnosis.rationale}
																							</p>
																						</div>
																					)}
																					{diagnosis.diagnosticTests &&
																						diagnosis.diagnosticTests.length >
																						0 && (
																							<div className="mb-2">
																								<strong>
																									Diagnostic Tests:
																								</strong>
																								<ul className="text-sm text-gray-700 mt-1 list-disc list-inside">
																									{diagnosis.diagnosticTests.map(
																										(test, _testIndex) => (
																											<li key={test}>{test}</li>
																										),
																									)}
																								</ul>
																							</div>
																						)}
																					{diagnosis.regionalConsiderations && (
																						<div>
																							<strong>
																								Regional Considerations:
																							</strong>
																							<p className="text-sm text-gray-700 mt-1">
																								{
																									diagnosis.regionalConsiderations
																								}
																							</p>
																						</div>
																					)}
																				</div>
																			),
																		)}
																	</div>
																</DialogContent>
															</Dialog>
														) : (
															<span className="text-gray-400">—</span>
														)}
													</td>
													<td className="px-4 py-3 text-sm">
														{vignette.hasLLMOutput ? (
															<span className="text-green-600">✓</span>
														) : (
															<span className="text-gray-400">—</span>
														)}
													</td>
													<td className="px-4 py-3 text-sm">
														{vignette.llmDiagnoses ? (
															<div className="max-w-xs">
																{vignette.llmDiagnoses
																	.slice(0, 2)
																	.map((diagnosis, index) => (
																		<div
																			key={`${diagnosis.diagnosis}-${diagnosis.icd10Code || index}`}
																			className="text-xs text-gray-600 mb-1"
																		>
																			<strong>{diagnosis.diagnosis}</strong>
																			{diagnosis.icd10Code &&
																				` (${diagnosis.icd10Code})`}
																		</div>
																	))}
																{vignette.llmDiagnoses.length > 2 && (
																	<div className="text-xs text-gray-500">
																		+{vignette.llmDiagnoses.length - 2} more
																	</div>
																)}
															</div>
														) : (
															<span className="text-gray-400">—</span>
														)}
													</td>
													<td className="px-4 py-3 text-sm space-x-2">
														<button
															onClick={() => handleEdit(vignette)}
															className="text-blue-600 hover:text-blue-800"
														>
															Edit
														</button>
														<button
															onClick={() => handleDelete(vignette)}
															className="text-red-600 hover:text-red-800"
														>
															Hapus
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}

					{/* LLM Generation Tab */}
					{activeTab === "llm" && (
						<div className="space-y-6">
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
								<p className="text-sm text-yellow-800">
									<strong>Peringatan:</strong> Ini akan menghasilkan diagnosis
									diferensial untuk semua vignette yang belum memiliki output
									LLM. Proses ini menggunakan OpenRouter API dan akan
									menimbulkan biaya.
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									OpenRouter API Key (Opsional)
								</label>
								<Input
									type="password"
									placeholder="sk-or-v1-... (kosongkan untuk menggunakan variabel env)"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
									className="max-w-md"
								/>
								<p className="text-sm text-gray-500 mt-1">
									Kosongkan untuk menggunakan OPENROUTER_API_KEY dari variabel
									environment. Atau masukkan key untuk sesi ini saja.
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									Model OpenRouter (Opsional)
								</label>
								<Input
									type="text"
									placeholder={`contoh: ${modelName}`}
									value={modelNameInput}
									onChange={(e) => setModelNameInput(e.target.value)}
									className="max-w-md"
								/>
								<p className="text-sm text-gray-500 mt-1">
									Kosongkan untuk menggunakan model default ({modelName}).
									Atau masukkan nama model OpenRouter (contoh: openai/gpt-4o, anthropic/claude-3.5-sonnet).
								</p>
							</div>

							<div className="bg-gray-50 border rounded-lg p-4">
								<h2 className="font-semibold mb-2">Pengaturan Generation:</h2>
								<ul className="text-sm text-gray-700 space-y-1">
									<li>• Model: {modelNameInput || modelName} (via OpenRouter)</li>
									<li>• Temperatur: 0.1</li>
									<li>• Maksimal diagnosis per vignette: 5</li>
									<li>• Menggunakan structured output (skema Zod)</li>
									<li>• Termasuk kode ICD-10 dan pertimbangan regional</li>
								</ul>
							</div>

							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<h3 className="font-semibold mb-2">Status Saat Ini:</h3>
								<p className="text-sm text-gray-700">
									{vignettes.filter((v) => v.hasLLMOutput).length} dari{" "}
									{vignettes.length} vignette memiliki output LLM yang
									dihasilkan
								</p>
							</div>

							<Button
								onClick={handleGenerate}
								disabled={generating}
								className="w-full sm:w-auto px-8"
							>
								{generating ? "Menghasilkan..." : "Hasilkan Semua Diagnosis"}
							</Button>

							{generating && progress.total > 0 && (
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
									<div className="mb-2 flex justify-between items-center">
										<span className="text-sm font-medium text-blue-900">
											Progres: {progress.current} dari {progress.total} vignette
										</span>
										<span className="text-sm text-blue-700">
											{Math.round((progress.current / progress.total) * 100)}%
										</span>
									</div>
									<div className="w-full bg-blue-200 rounded-full h-3">
										<div
											className="bg-blue-600 h-3 rounded-full transition-all duration-300"
											style={{
												width: `${(progress.current / progress.total) * 100}%`,
											}}
										/>
									</div>
								</div>
							)}

							{status && (
								<div
									className={`p-4 rounded-lg ${status.startsWith("✓")
										? "bg-green-50 border border-green-200 text-green-800"
										: status.startsWith("✗")
											? "bg-red-50 border border-red-200 text-red-800"
											: "bg-blue-50 border border-blue-200 text-blue-800"
										}`}
								>
									<p>{status}</p>
								</div>
							)}

							<div className="mt-12 pt-6 border-t">
								<h2 className="text-xl font-semibold mb-4">Instruksi</h2>
								<ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
									<li>
										Pastikan database D1 telah diinisialisasi dan vignette telah
										di-seed
									</li>
									<li>
										Atur OPENROUTER_API_KEY di file .env, atau masukkan
										OpenRouter API key Anda di atas
									</li>
									<li>
										Klik "Hasilkan Semua Diagnosis" untuk memulai batch generation
									</li>
									<li>
										Tunggu hingga selesai (mungkin memakan waktu 2-3 menit untuk
										15 vignette)
									</li>
									<li>Output LLM akan disimpan ke database</li>
								</ol>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
