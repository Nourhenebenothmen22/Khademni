import fs from "node:fs/promises";
import * as pdfParseModule from "pdf-parse";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { getAbsolutePath, fileExists } from "../../lib/file-storage.js";
import { logger } from "../../lib/logger.js";
import { getSemanticProvider } from "./semantic-factory.js";

const pdfParse = ((pdfParseModule as { default?: unknown }).default || pdfParseModule) as (
  dataBuffer: Buffer,
  options?: Record<string, unknown>,
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.warn(
        { err: message, documentId },
        "pdf-parse extraction failed, falling back to clean text extraction.",
      );
      // eslint-disable-next-line no-control-regex
      extractedText = buffer.toString("utf-8").replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, " ");
    }
  } else {
    extractedText = buffer.toString("utf-8");
  }

  const structuredData = extractGenericMetadata(extractedText);

  const parseResult = await prisma.documentParseResult.create({
    data: {
      documentId: doc.id,
      extractedText,
      structuredData: structuredData as unknown as object,
      parserName,
      parserVersion,
    },
  });

  // Generate and persist ONNX 384d vector embedding for pgvector & candidate_hybrid_indexes
  try {
    const provider = getSemanticProvider("onnx-transformer");
    if (provider && "generateVector" in provider && typeof provider.generateVector === "function") {
      const vector384: number[] = await (provider as { generateVector: (text: string) => Promise<number[]> }).generateVector(extractedText);
      if (vector384 && vector384.length === 384) {
        const formattedVec = `[${vector384.join(",")}]`;
        const escapedContent = extractedText.replace(/'/g, "''").substring(0, 8000);
        
        await prisma.$executeRawUnsafe(
          `UPDATE document_parse_results SET embedding = '${formattedVec}'::vector WHERE id = '${parseResult.id}'`,
        );

        const hybridId = `chi_${parseResult.id}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO candidate_hybrid_indexes (id, application_id, content, dense_embedding, search_vector, created_at, updated_at) VALUES ('${hybridId}', '${doc.applicationId}', '${escapedContent}', '${formattedVec}'::vector, to_tsvector('simple', '${escapedContent}'), NOW(), NOW()) ON CONFLICT (application_id) DO UPDATE SET content = EXCLUDED.content, dense_embedding = EXCLUDED.dense_embedding, search_vector = EXCLUDED.search_vector, updated_at = NOW()`,
        );
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn({ err: message, documentId: doc.id }, "Vector embedding persistence during document ingestion skipped due to error.");
  }

  await prisma.applicationDocument.update({
    where: { id: doc.id },
    data: { status: "SCANNED", scannedAt: new Date() },
  });

  return parseResult;
}

