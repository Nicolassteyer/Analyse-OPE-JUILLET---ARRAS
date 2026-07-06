import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import healthRoutes from "./routes/health.routes.js";
import importRoutes from "./routes/import.routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api/health", healthRoutes);
app.use("/api/imports", importRoutes);

if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../client/dist");
  const clientIndex = path.join(clientDist, "index.html");

  app.use(express.static(clientDist));
  app.get("*", (_request, response) => {
    if (!fs.existsSync(clientIndex)) {
      return response.status(503).send("Frontend build missing. Check Render build command: npm install --include=dev && npm run install:all && npm run build");
    }

    return response.sendFile(clientIndex);
  });
}

app.listen(port, () => {
  console.log(`FLAMS Analytics PRO API listening on ${port}`);
});
