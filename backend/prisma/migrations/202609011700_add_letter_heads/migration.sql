CREATE TABLE "LetterHead" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileContent" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LetterHead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LetterHead_ownerId_key" ON "LetterHead"("ownerId");
CREATE INDEX "LetterHead_updatedAt_idx" ON "LetterHead"("updatedAt");

ALTER TABLE "LetterHead"
ADD CONSTRAINT "LetterHead_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
