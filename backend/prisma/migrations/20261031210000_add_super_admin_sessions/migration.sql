CREATE TABLE "SuperAdminSession" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "csrf" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuperAdminSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuperAdminSession_expiresAt_idx" ON "SuperAdminSession"("expiresAt");
CREATE INDEX "SuperAdminSession_email_expiresAt_idx" ON "SuperAdminSession"("email", "expiresAt");
