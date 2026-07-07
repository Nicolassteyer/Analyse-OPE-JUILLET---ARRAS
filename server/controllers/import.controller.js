import { parseFlamsHtml } from "../parser/flamsParser.js";
import { readImportStore, removeStoredHtml, resetImportStore, saveImportResult } from "../services/importStore.service.js";

export async function listImports(_request, response) {
  const store = await readImportStore();
  return response.json(store);
}

export async function uploadHtml(request, response) {
  const { year } = request.params;

  if (!["2025", "2026"].includes(year)) {
    return response.status(400).json({ message: "Annee invalide" });
  }

  if (!request.file) {
    return response.status(400).json({ message: "Fichier HTML manquant" });
  }

  const parsed = await parseFlamsHtml(request.file.path, Number(year));
  const importResult = {
    message: "Import recu",
    file: request.file.originalname,
    storedFile: request.file.filename,
    year: Number(year),
    parsed,
  };
  const store = await saveImportResult(importResult);
  await removeStoredHtml(year);

  return response.status(201).json({
    ...importResult,
    store,
  });
}

export async function resetImports(_request, response) {
  const store = await resetImportStore();
  await removeStoredHtml(2025);
  await removeStoredHtml(2026);
  return response.json(store);
}
