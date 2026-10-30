import express, { Router } from "express";

import { DatabaseUnavailableError } from "../data/store";
import { getPrismaClient } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createPrintablePdf } from "../utils/letterHeadPdf";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

export const letterHeadsRouter = Router();

letterHeadsRouter.use(requireAuth);
letterHeadsRouter.use(express.json({ limit: "35mb" }));

function getDatabase() {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new DatabaseUnavailableError();
  }

  return prisma;
}

function toDataUri(mimeType: string, content: Buffer | Uint8Array) {
  return `data:${mimeType};base64,${Buffer.from(content).toString("base64")}`;
}

function parseDataUri(dataUri: unknown, allowedTypes: Set<string>) {
  if (typeof dataUri !== "string") {
    throw new Error("File data is required.");
  }

  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUri);
  if (!match || !allowedTypes.has(match[1])) {
    throw new Error("Only PDF, PNG, JPG, and JPEG files are supported.");
  }

  const content = Buffer.from(match[2], "base64");
  if (!content.length || content.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("File must be between 1 byte and 25 MB.");
  }

  return { mimeType: match[1], content };
}

function serializeLetterHead(record: { fileName: string; fileSize: number; mimeType: string; fileContent: Buffer | Uint8Array; updatedAt: Date; ownerId: string }) {
  return {
    fileName: record.fileName,
    fileSize: record.fileSize,
    fileType: record.mimeType,
    fileData: toDataUri(record.mimeType, record.fileContent),
    uploadedAt: record.updatedAt.toISOString(),
    ownerId: record.ownerId
  };
}

letterHeadsRouter.get("/", async (request, response, next) => {
  try {
    const record = await getDatabase().letterHead.findUnique({ where: { ownerId: request.user!.id } });
    response.json(record ? serializeLetterHead(record) : null);
  } catch (error) {
    next(error);
  }
});

letterHeadsRouter.put("/", async (request, response, next) => {
  try {
    if (request.user!.role === "Viewer") {
      response.status(403).json({ message: "Only Admin and Engineer roles may manage Letter Head files." });
      return;
    }

    const fileName = typeof request.body?.fileName === "string" ? request.body.fileName.trim() : "";
    if (!fileName || fileName.length > 255) {
      response.status(400).json({ message: "A valid Letter Head filename is required." });
      return;
    }

    const file = parseDataUri(request.body?.fileData, allowedMimeTypes);
    const record = await getDatabase().letterHead.upsert({
      where: { ownerId: request.user!.id },
      create: {
        ownerId: request.user!.id,
        fileName,
        mimeType: file.mimeType,
        fileSize: file.content.length,
        fileContent: file.content
      },
      update: {
        fileName,
        mimeType: file.mimeType,
        fileSize: file.content.length,
        fileContent: file.content
      }
    });

    response.json(serializeLetterHead(record));
  } catch (error) {
    next(error);
  }
});

letterHeadsRouter.delete("/", async (request, response, next) => {
  try {
    if (request.user!.role === "Viewer") {
      response.status(403).json({ message: "Only Admin and Engineer roles may manage Letter Head files." });
      return;
    }

    const existing = await getDatabase().letterHead.findUnique({ where: { ownerId: request.user!.id } });
    if (!existing) {
      response.status(404).json({ message: "Letter Head not found." });
      return;
    }

    await getDatabase().letterHead.delete({ where: { ownerId: request.user!.id } });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

letterHeadsRouter.post("/print", async (request, response, next) => {
  try {
    const fileName = typeof request.body?.fileName === "string" ? request.body.fileName.trim() : "document";
    const includeLetterHead = request.body?.includeLetterHead === true;
    const document = parseDataUri(request.body?.fileData, allowedMimeTypes);
    const letterHead = includeLetterHead
      ? await getDatabase().letterHead.findUnique({ where: { ownerId: request.user!.id } })
      : null;

    if (includeLetterHead && !letterHead) {
      response.status(404).json({ message: "No Letter Head is available for this account." });
      return;
    }

    const pdf = await createPrintablePdf({
      letterHead: letterHead
        ? { mimeType: letterHead.mimeType, fileContent: Buffer.from(letterHead.fileContent) }
        : null,
      documentContent: document.content,
      documentMimeType: document.mimeType
    });
    const printableName = fileName.replace(/\.[^.]+$/, "") || "document";

    response
      .status(200)
      .setHeader("Content-Type", "application/pdf")
      .setHeader("Content-Disposition", `inline; filename="${printableName}-print.pdf"`)
      .send(Buffer.from(pdf));
  } catch (error) {
    next(error);
  }
});
