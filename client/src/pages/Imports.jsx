import { UploadDropzone } from "../components/upload/UploadDropzone.jsx";

const history = [
  { year: 2026, file: "ope-juillet-arras-2026.html", status: "Pret pour parsing" },
  { year: 2025, file: "ope-juillet-arras-2025.html", status: "Pret pour parsing" },
];

export default function Imports() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-black uppercase text-brand">Imports</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Depots HTML FLAMS</h1>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <UploadDropzone year="2025" />
        <UploadDropzone year="2026" />
      </section>
      <section className="glass-panel rounded-lg p-5">
        <h2 className="text-xl font-black">Historique des imports</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {history.map((item) => (
            <div key={item.file} className="grid grid-cols-[90px_1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
              <strong>{item.year}</strong>
              <span className="font-semibold text-slate-700">{item.file}</span>
              <span className="text-sm font-black text-brand">{item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
