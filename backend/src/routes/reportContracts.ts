import { Router } from "express";

import { reportContractsRepository, reportContractsReadiness } from "../data/reportContractsRepository";
import { requireAuth } from "../middleware/auth";

export const reportContractsRouter = Router();
reportContractsRouter.use(requireAuth);
reportContractsRouter.use((_request, response, next) => {
  response.setHeader("Cache-Control", "private, no-store");
  next();
});

reportContractsRouter.get("/readiness", (_request, response) => response.json(reportContractsReadiness()));
reportContractsRouter.get("/definitions", async (request, response) => response.json(await reportContractsRepository.listDefinitions(request.user!)));
reportContractsRouter.get("/templates", async (request, response) => response.json(await reportContractsRepository.listTemplates(request.user!)));
reportContractsRouter.get("/runs", async (request, response) => response.json(await reportContractsRepository.listRuns(request.user!)));
reportContractsRouter.get("/schedules", async (request, response) => response.json(await reportContractsRepository.listSchedules(request.user!)));
reportContractsRouter.get("/exports", async (request, response) => response.json(await reportContractsRepository.listExports(request.user!)));
reportContractsRouter.get("/configuration", async (request, response) => response.json(await reportContractsRepository.getConfiguration(request.user!)));

// Preparation-only guard: no new Reports contract mutation is enabled by this change.
reportContractsRouter.all(["/definitions", "/templates", "/runs", "/schedules", "/exports", "/configuration"], (request, response) => {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return response.status(405).json({ message: "Method not supported by the read-only preparation contract" });
  return response.status(423).json({ message: "Reports contract writes are blocked pending explicit migration, permission and deployment approval" });
});
