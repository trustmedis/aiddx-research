import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
			<div className="max-w-3xl bg-white rounded-lg shadow-md p-12 text-center">
				<h1 className="text-4xl font-bold mb-4">
					Riset Diagnosis Diferensial AI
				</h1>
				<p className="text-xl text-gray-700 mb-8">
					Evaluasi Dukungan Keputusan Klinis yang Dihasilkan LLM
				</p>

				<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
					<h2 className="text-lg font-semibold mb-3">Gambaran Studi</h2>
					<div className="text-left text-gray-700 space-y-2">
						<p>• 15 vignette klinis (6 umum, 5 ambigu, 4 emergensi)</p>
						<p>• Diagnosis diferensial yang dihasilkan LLM</p>
						<p>• 4 pertanyaan evaluasi per kasus</p>
						<p>• Estimasi waktu: 45-60 menit</p>
					</div>
				</div>

				<div className="space-y-4">
					<Link to="/evaluate/consent">
						<Button className="w-full sm:w-auto px-12 py-6 text-lg">
							Mulai Evaluasi
						</Button>
					</Link>

					<p className="text-sm text-gray-600">
						Untuk penilai yang berpartisipasi dalam studi
					</p>
				</div>

				<div className="mt-12 pt-8 border-t text-sm text-gray-500">
					<p>Studi Proof of Concept - Protokol 14 Hari</p>
					<p className="mt-2">Kontak: koordinator penelitian</p>
				</div>
			</div>
		</div>
	);
}
