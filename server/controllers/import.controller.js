import { parseFlamsHtml } from "../parser/flamsParser.js";

export async function uploadHtml(request, response) {
  const { year } = request.params;

  if (!["2025", "2026"].includes(year)) {
    return response.status(400).json({ message: "Annee invalide" });
  }

  if (!request.file) {
    return response.status(400).json({ message: "Fichier HTML manquant" });
  }

  const parsed = await parseFlamsHtml(request.file.path, Number(year));

  return response.status(201).json({
    message: "Import recu",
    file: request.file.filename,
    year: Number(year),
    parsed
  });
}
