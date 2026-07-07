import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
const dataDir = path.join(serverRoot, "data");
const storePath = path.join(dataDir, "analysis-store.json");
const emptyStore = {
  importsByYear: {
    2025: null,
    2026: null,
  },
  history: [],
};

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

export async function readImportStore() {
  try {
    const content = await fs.readFile(storePath, "utf8");
    return { ...emptyStore, ...JSON.parse(content) };
  } catch (error) {
    if (error.code === "ENOENT") {
      return emptyStore;
    }

    throw error;
  }
}

export async function saveImportResult(importResult) {
  await ensureDataDir();
  const store = await readImportStore();
  const savedImport = {
    ...importResult,
    importedAt: new Date().toISOString(),
  };

  store.importsByYear[String(importResult.year)] = savedImport;
  store.history = [savedImport, ...(store.history || [])].slice(0, 20);

  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  return store;
}

export async function resetImportStore() {
  await ensureDataDir();
  await fs.writeFile(storePath, JSON.stringify(emptyStore, null, 2), "utf8");
  return emptyStore;
}

export async function removeStoredHtml(year) {
  const uploadDir = path.join(serverRoot, "uploads", String(year));
  try {
    const entries = await fs.readdir(uploadDir);
    await Promise.all(
      entries
        .filter((entry) => /\.(html|htm)$/i.test(entry))
        .map((entry) => fs.rm(path.join(uploadDir, entry), { force: true })),
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
