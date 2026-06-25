/*
  Warnings:

  - You are about to drop the `cv_parse_results` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "cv_parse_results" DROP CONSTRAINT "cv_parse_results_documentId_fkey";

-- DropTable
DROP TABLE "cv_parse_results";

-- CreateTable
CREATE TABLE "document_parse_results" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "structuredData" JSONB,
    "parserName" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_parse_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_parse_results_documentId_key" ON "document_parse_results"("documentId");

-- AddForeignKey
ALTER TABLE "document_parse_results" ADD CONSTRAINT "document_parse_results_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "application_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
