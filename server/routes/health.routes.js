import { Router } from "express";

const router = Router();

router.get("/", (_request, response) => {
  response.json({
    status: "ok",
    service: "flams-analytics-pro",
    timestamp: new Date().toISOString()
  });
});

export default router;
