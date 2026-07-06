const API_BASE = import.meta.env.VITE_API_URL || "";

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/api/health`);
  if (!response.ok) {
    throw new Error("API indisponible");
  }
  return response.json();
}

export function uploadHtmlExport({ year, file, onProgress }) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/api/imports/${year}`);

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener("load", () => {
      let payload = {};
      try {
        payload = request.responseText ? JSON.parse(request.responseText) : {};
      } catch {
        payload = { message: request.responseText || "Reponse serveur invalide" };
      }

      if (request.status >= 200 && request.status < 300) {
        resolve(payload);
        return;
      }

      reject(new Error(payload.message || "Upload impossible"));
    });

    request.addEventListener("error", () => reject(new Error("Connexion interrompue pendant l'upload")));
    request.send(formData);
  });
}
