import { PDFDocument } from "pdf-lib";

type StoredLetterHead = {
  mimeType: string;
  fileContent: Buffer;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

function isPdf(mimeType: string) {
  return mimeType === "application/pdf";
}

function isJpeg(mimeType: string) {
  return mimeType === "image/jpeg";
}

function isPng(mimeType: string) {
  return mimeType === "image/png";
}

async function appendPdfPages(target: PDFDocument, source: Uint8Array) {
  const sourcePdf = await PDFDocument.load(source);
  const pages = await target.copyPages(sourcePdf, sourcePdf.getPageIndices());
  pages.forEach((page) => target.addPage(page));
}

async function appendImagePage(target: PDFDocument, source: Uint8Array, mimeType: string) {
  const image = isPng(mimeType) ? await target.embedPng(source) : await target.embedJpg(source);
  const page = target.addPage([A4_WIDTH, A4_HEIGHT]);
  const scale = Math.min((A4_WIDTH - 48) / image.width, (A4_HEIGHT - 48) / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: (A4_WIDTH - width) / 2,
    y: (A4_HEIGHT - height) / 2,
    width,
    height
  });
}

export async function createPrintablePdf({
  letterHead,
  documentContent,
  documentMimeType
}: {
  letterHead: StoredLetterHead | null;
  documentContent: Buffer;
  documentMimeType: string;
}): Promise<Uint8Array> {
  const output = await PDFDocument.create();

  // The Letter Head is copied into the output first, preserving both source files unchanged.
  if (letterHead) {
    if (isPdf(letterHead.mimeType)) {
      await appendPdfPages(output, letterHead.fileContent);
    } else if (isJpeg(letterHead.mimeType) || isPng(letterHead.mimeType)) {
      await appendImagePage(output, letterHead.fileContent, letterHead.mimeType);
    }
  }

  if (isPdf(documentMimeType)) {
    await appendPdfPages(output, documentContent);
  } else if (isJpeg(documentMimeType) || isPng(documentMimeType)) {
    await appendImagePage(output, documentContent, documentMimeType);
  } else {
    throw new Error("Only PDF, PNG, JPG, and JPEG documents can be printed.");
  }

  return output.save();
}
