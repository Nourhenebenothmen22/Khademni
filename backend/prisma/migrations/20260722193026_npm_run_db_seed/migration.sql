-- CreateIndex
CREATE INDEX "application_documents_sha256_idx" ON "application_documents"("sha256");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_revokedAt_idx" ON "auth_sessions"("userId", "revokedAt");
