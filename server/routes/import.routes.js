import { Router } from "express";
import { uploadHtml } from "../controllers/import.controller.js";
import { htmlUpload } from "../services/upload.service.js";

const router = Router();

router.post("/:year", htmlUpload.single("file"), uploadHtml);

export default router;
