import { UploadDropzone } from "../components/upload/UploadDropzone.jsx";
import { useAnalysisStore } from "../hooks/useAnalysisStore.jsx";

function formatDate(value) {
  return value ? new Date(value).toLocaleString("fr-FR") : "-";
}

export default function Imports() {
  const { error, history, loading, refreshImports, resetImports, saveImport } = useAnalysisStore();

  async function handleReset() {
    await resetImports();
  }

  function addImport(item) {
    saveImport(item);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-brand">Imports</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Depots HTML FLAMS</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-muted">
            Les analyses importees sont conservees cote serveur pour tous les visiteurs du lien. Les fichiers HTML sont supprimes apres parsing.
          </p>
          {error ? <p className="mt-2 text-sm font-black text-orange-700">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={refreshImports} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
            Rafraichir
          </button>
          <button type="button" onClick={handleReset} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">
            Remettre a zero
          </button>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <UploadDropzone year="2025" onUploaded={addImport} />
        <UploadDropzone year="2026" onUploaded={addImport} />
      </section>
      <section className="glass-panel rounded-lg p-5">
        <h2 className="text-xl font-black">Historique des imports</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {loading ? <div className="px-4 py-6 text-sm font-semibold text-muted">Chargement de l'historique...</div> : null}
          {!loading && history.length === 0 ? (
            <div className="px-4 py-6 text-sm font-semibold text-muted">Aucun export importe.</div>
          ) : null}
          {history.map((item) => (
            <div
              key={`${item.year}-${item.file}-${item.importedAt}`}
              className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid-cols-[90px_1fr_180px_1fr]"
            >
              <strong>{item.year}</strong>
              <span className="font-semibold text-slate-700">{item.file}</span>
              <span className="text-sm font-semibold text-muted">{formatDate(item.importedAt)}</span>
              <span className="text-sm font-black text-brand">{item.parsed?.scope || "Analyse enregistree"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
