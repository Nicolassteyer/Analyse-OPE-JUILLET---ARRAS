import { UploadCloud } from "lucide-react";
import { useState } from "react";

export function UploadDropzone({ year }) {
  const [progress, setProgress] = useState(0);

  function simulateUpload() {
    setProgress(18);
    window.setTimeout(() => setProgress(68), 350);
    window.setTimeout(() => setProgress(100), 800);
  }

  return (
    <button
      type="button"
      onClick={simulateUpload}
      className="flex min-h-52 w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-brand hover:bg-emerald-50/40"
    >
      <UploadCloud className="mb-4 text-brand" size={34} />
      <span className="text-lg font-black text-slate-950">Deposer HTML {year}</span>
      <span className="mt-2 text-sm font-semibold text-muted">Drag & drop ou clic pour selectionner un export FLAMS</span>
      <span className="mt-5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </span>
    </button>
  );
}
