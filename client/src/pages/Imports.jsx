import { useState } from "react";
import { UploadDropzone } from "../components/upload/UploadDropzone.jsx";

export default function Imports() {
  const [history, setHistory] = useState([]);

  function addImport(item) {
    setHistory((current) => [{ ...item, importedAt: new Date().toLocaleString("fr-FR") }, ...current]);
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-black uppercase text-brand">Imports</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Depots HTML FLAMS</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-muted">
          Importe les exports HTML FLAMS par annee. L'analyse cible OPE Juillet Arras et separera les clients du midi, du soir et le total.
        </p>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <UploadDropzone year="2025" onUploaded={addImport} />
        <UploadDropzone year="2026" onUploaded={addImport} />
      </section>
      <section className="glass-panel rounded-lg p-5">
        <h2 className="text-xl font-black">Historique des imports</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {history.length === 0 ? (
            <div className="px-4 py-6 text-sm font-semibold text-muted">Aucun export importe sur cette session.</div>
          ) : null}
          {history.map((item) => (
            <div
              key={`${item.year}-${item.file}-${item.importedAt}`}
              className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid-cols-[90px_1fr_180px_auto]"
            >
              <strong>{item.year}</strong>
              <span className="font-semibold text-slate-700">{item.file}</span>
              <span className="text-sm font-semibold text-muted">{item.importedAt}</span>
              <span className="text-sm font-black text-brand">{item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
