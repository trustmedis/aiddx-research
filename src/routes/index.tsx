import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { getAllVignettesWithStats } from "~/server/functions";

export const Route = createFileRoute("/")({
	loader: async () => {
		return {
			vignettes: await getAllVignettesWithStats(),
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { vignettes } = Route.useLoaderData();
	// calculate common, ambiguous, emergent, rare
	const common = vignettes.filter((v) => v.category === "common").length;
	const ambiguous = vignettes.filter((v) => v.category === "ambiguous").length;
	const emergent = vignettes.filter((v) => v.category === "emergent").length;
	const rare = vignettes.filter((v) => v.category === "rare").length;

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
			<div className="max-w-3xl bg-white rounded-lg shadow-md p-12 text-center">
				<h1 className="text-4xl font-bold mb-4">
					Penelitian Diagnosis Diferensial oleh AI
				</h1>
				<p className="text-xl text-gray-700 mb-8">
					Evaluasi Dukungan Keputusan Klinis yang Dihasilkan LLM
				</p>

				<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
					<h2 className="text-lg font-semibold mb-3">Gambaran Evaluasi</h2>
					<div className="text-left text-gray-700 space-y-2">
						<ol className="list-decimal space-y-2 list-inside">
							<li>
								Terdiri dari {vignettes.length} vignette klinis ({common} <em>common</em>, {ambiguous} <em>ambiguous</em>, {emergent} <em>emergent</em>, {rare} <em>rare</em>)
							</li>
							<li>
								AI akan memberikan <em>Differential diagnosis</em> untuk setiap vignette
							</li>
							<li>
								Setiap kasus akan terdiri dari 6 pertanyaan
							</li>
							<li>
								Estimasi waktu: 15-25 menit untuk selesai
							</li>
						</ol>
					</div>
				</div>

				<div className="space-y-4">
					<Link to="/evaluate/consent">
						<Button className="w-full sm:w-auto px-12 py-6 text-lg">
							Mulai Evaluasi
						</Button>
					</Link>
				</div>

				<div className="mt-12 pt-8 border-t text-sm text-gray-500">
					<p className="mt-2">Kontak: abid@ts.co.id</p>
				</div>
			</div>
		</div>
	);
}
