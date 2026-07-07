import { Router } from "express";
import { listImports, resetImports, uploadHtml } from "../controllers/import.controller.js";
import { htmlUpload } from "../services/upload.service.js";

const router = Router();

router.get("/", listImports);
router.post("/:year", htmlUpload.single("file"), uploadHtml);
router.delete("/", resetImports);

export default router;
