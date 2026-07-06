import { CheckCircle2, FileWarning, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { uploadHtmlExport } from "../../services/api.js";

export function UploadDropzone({ year, onUploaded }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Drag & drop ou clic pour selectionner un export FLAMS");

  async function uploadFile(file) {
    if (!file) {
      return;
    }

    if (!/\.(html|htm)$/i.test(file.name)) {
      setStatus("error");
      setMessage("Format refuse: selectionne un fichier .html ou .htm");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setMessage(file.name);

    try {
      const result = await uploadHtmlExport({
        year,
        file,
        onProgress: setProgress,
      });

      setStatus("done");
      setProgress(100);
      setMessage(`${file.name} importe et analyse`);
      onUploaded?.({
        year,
        file: file.name,
        status: "Import reussi",
        parsed: result.parsed,
      });
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    uploadFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
      className="flex min-h-52 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-brand hover:bg-emerald-50/40"
    >
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".html,.htm,text/html"
        onChange={(event) => {
          uploadFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {status === "done" ? <CheckCircle2 className="mb-4 text-emerald-600" size={34} /> : null}
      {status === "error" ? <FileWarning className="mb-4 text-orange-700" size={34} /> : null}
      {status !== "done" && status !== "error" ? <UploadCloud className="mb-4 text-brand" size={34} /> : null}
      <span className="text-lg font-black text-slate-950">Deposer HTML {year}</span>
      <span className="mt-2 text-sm font-semibold text-muted">{message}</span>
      <span className="mt-5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full transition-all ${status === "error" ? "bg-orange-700" : "bg-brand"}`}
          style={{ width: `${progress}%` }}
        />
      </span>
    </div>
  );
}
