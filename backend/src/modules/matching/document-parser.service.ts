import fs from "node:fs/promises";
import * as pdfParseModule from "pdf-parse";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { getAbsolutePath, fileExists } from "../../lib/file-storage.js";
import { logger } from "../../lib/logger.js";

const pdfParse = ((pdfParseModule as any).default || pdfParseModule) as (
  dataBuffer: Buffer,
  options?: any,
) => Promise<{ text: string }>;

interface GenericDocumentMetadata {
  characterCount: number;
  wordCount: number;
  lineCount: number;
}

/**
 * Computes domain-agnostic text metadata without hardcoding any specific skills or qualifications.
 */
function extractGenericMetadata(text: string): GenericDocumentMetadata {
  const lines = text.split(/\r\n|\r|\n/);
  const words = text.trim().split(/\s+/).filter(Boolean);

  return {
    characterCount: text.length,
    wordCount: words.length,
    lineCount: lines.length,
  };
}

export async function parseDocument(documentId: string) {
  const doc = await prisma.applicationDocument.findUnique({
    where: { id: documentId },
    include: { parseResult: true },
  });

  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  if (doc.parseResult) {
    return doc.parseResult;
  }

  const exists = await fileExists(doc.storageKey);
  if (!exists) {
    throw new AppError("File does not exist on disk", 404);
  }

  const absolutePath = getAbsolutePath(doc.storageKey);
  const buffer = await fs.readFile(absolutePath);

  let extractedText = "";
  let parserName = "GenericTextParser";
  let parserVersion = "3.0";

  if (doc.mimeType === "application/pdf" || doc.extension === ".pdf") {
    try {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text || "";
      parserName = "PdfParseEngine";
      parserVersion = "1.1.1";
    } catch (err: any) {
      logger.warn(
        { err: err?.message, documentId },
        "pdf-parse extraction failed, falling back to clean text extraction.",
      );
      extractedText = buffer.toString("latin1").replace(/[^\x20-\x7E\n\r\t]/g, " ");
    }
  } else {
    extractedText = buffer.toString("utf-8");
  }

  const structuredData = extractGenericMetadata(extractedText);

  const parseResult = await prisma.documentParseResult.create({
    data: {
      documentId: doc.id,
      extractedText,
      structuredData: structuredData as any,
      parserName,
      parserVersion,
    },
  });

  await prisma.applicationDocument.update({
    where: { id: doc.id },
    data: { status: "SCANNED", scannedAt: new Date() },
  });

  return parseResult;
}

