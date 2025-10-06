import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export const Route = createFileRoute("/evaluate/consent")({
	component: ConsentPage,
});

function ConsentPage() {
	const navigate = useNavigate();
	const [raterId, setRaterId] = useState("");
	const [agreed, setAgreed] = useState(false);
	const consentId = useId();

	const handleStart = () => {
		if (raterId.trim() && agreed) {
			navigate({
				to: "/evaluate/calibration",
				search: { raterId: raterId.trim() },
			});
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 py-12 px-4">
			<div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
				<h1 className="text-3xl font-bold mb-6">
					Studi Evaluasi Diagnosis Diferensial
				</h1>

				<div className="space-y-6 mb-8">
					<section>
						<h2 className="text-xl font-semibold mb-3">Tujuan</h2>
						<p className="text-gray-700">
							Studi ini mengevaluasi kegunaan klinis dari diagnosis diferensial
							yang dihasilkan AI. Anda akan meninjau 15 vignette pasien dan
							menilai apakah diagnosis yang dihasilkan LLM relevan, aman, dan
							dapat diterima untuk dukungan keputusan klinis.
						</p>
					</section>

					<section>
						<h2 className="text-xl font-semibold mb-3">
							Yang Akan Anda Lakukan
						</h2>
						<ul className="list-disc list-inside text-gray-700 space-y-2">
							<li>Menyelesaikan sesi kalibrasi singkat (2 kasus latihan)</li>
							<li>
								Mengevaluasi 15 vignette klinis dengan diagnosis diferensial
								yang dihasilkan AI
							</li>
							<li>
								Menjawab 4 pertanyaan per vignette (memakan waktu ~2-3 menit per
								kasus)
							</li>
							<li>Total waktu: sekitar 45-60 menit</li>
						</ul>
					</section>

					<section>
						<h2 className="text-xl font-semibold mb-3">Kerahasiaan</h2>
						<p className="text-gray-700">
							Semua vignette adalah kasus sintetis/de-identifikasi. Tanggapan
							Anda akan dianonimkan dan hanya digunakan untuk tujuan penelitian.
							ID penilai Anda hanya untuk melacak progres.
						</p>
					</section>

					<section>
						<h2 className="text-xl font-semibold mb-3">Partisipasi Sukarela</h2>
						<p className="text-gray-700">
							Partisipasi Anda bersifat sukarela. Anda dapat mengundurkan diri
							kapan saja. Tidak ada konsekuensi untuk menolak atau menghentikan
							partisipasi.
						</p>
					</section>
				</div>

				<div className="border-t pt-6 space-y-6">
					<div>
						<label className="block text-sm font-medium mb-2">ID Penilai</label>
						<Input
							type="text"
							placeholder="Masukkan ID penilai Anda (contoh: R001, R002)"
							value={raterId}
							onChange={(e) => setRaterId(e.target.value)}
							className="max-w-md"
						/>
						<p className="text-sm text-gray-500 mt-1">
							Gunakan ID yang diberikan kepada Anda oleh koordinator penelitian
						</p>
					</div>

					<div className="flex items-start space-x-3">
						<input
							type="checkbox"
							id={consentId}
							checked={agreed}
							onChange={(e) => setAgreed(e.target.checked)}
							className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
						/>
						<label htmlFor={consentId} className="text-sm text-gray-700">
							Saya telah membaca dan memahami informasi di atas. Saya setuju
							untuk berpartisipasi dalam studi ini dan memahami bahwa tanggapan
							saya akan digunakan untuk tujuan penelitian.
						</label>
					</div>

					<Button
						onClick={handleStart}
						disabled={!raterId.trim() || !agreed}
						className="w-full sm:w-auto px-8"
					>
						Lanjut ke Kalibrasi
					</Button>
				</div>
			</div>
		</div>
	);
}
