import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");

const storage = multer.diskStorage({
  destination(request, _file, callback) {
    const year = request.params.year || "unknown";
    const uploadDir = path.join(serverRoot, "uploads", year);
    fs.mkdirSync(uploadDir, { recursive: true });
    callback(null, uploadDir);
  },
  filename(_request, file, callback) {
    const safeName = file.originalname.replace(/[^a-z0-9_.-]/gi, "_").toLowerCase();
    callback(null, `${Date.now()}-${safeName}`);
  }
});

export const htmlUpload = multer({
  storage,
  fileFilter(_request, file, callback) {
    const isHtml = file.mimetype === "text/html" || /\.(html|htm)$/i.test(file.originalname);
    callback(isHtml ? null : new Error("Seuls les exports HTML sont acceptes"), isHtml);
  },
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});
