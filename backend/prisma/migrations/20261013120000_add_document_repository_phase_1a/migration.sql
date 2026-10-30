CREATE TYPE "DocumentApprovalStatus" AS ENUM (
  'Draft', 'Submitted', 'Under Review', 'Approved', 'Approved with Comments',
  'Rejected', 'Superseded', 'Archived'
);

CREATE TYPE "DocumentValidityStatus" AS ENUM (
  'Current', 'Review Due', 'Expiring Soon', 'Expired', 'No Expiry'
);

CREATE TYPE "DocumentProcessingStatus" AS ENUM (
  'Uploading', 'Processing', 'Pending Metadata', 'Processing Error'
);

CREATE TABLE "Document_Family" (
  "Document_Family_ID" TEXT NOT NULL,
  "Owner_ID" TEXT NOT NULL,
  "Created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_Family_pkey" PRIMARY KEY ("Document_Family_ID"),
  CONSTRAINT "Document_Family_Owner_ID_fkey" FOREIGN KEY ("Owner_ID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Managed_Document" (
  "Document_ID" TEXT NOT NULL,
  "Document_Family_ID" TEXT NOT NULL,
  "Document_Number" TEXT,
  "Title" TEXT NOT NULL,
  "Document_Type" TEXT NOT NULL,
  "Document_Category" TEXT NOT NULL,
  "Description" TEXT,
  "Is_Global" BOOLEAN NOT NULL DEFAULT false,
  "Owner_ID" TEXT NOT NULL,
  "Created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Updated_At" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Managed_Document_pkey" PRIMARY KEY ("Document_ID"),
  CONSTRAINT "Managed_Document_Document_Family_ID_fkey" FOREIGN KEY ("Document_Family_ID") REFERENCES "Document_Family"("Document_Family_ID") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Managed_Document_Owner_ID_fkey" FOREIGN KEY ("Owner_ID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Document_Version" (
  "Document_Version_ID" TEXT NOT NULL,
  "Document_ID" TEXT NOT NULL,
  "Document_Revision" TEXT,
  "File_Name" TEXT NOT NULL,
  "MIME_Type" TEXT NOT NULL,
  "File_Size_Bytes" INTEGER NOT NULL,
  "File_Hash_SHA256" TEXT NOT NULL,
  "File_Content" BYTEA NOT NULL,
  "Approval_Status" "DocumentApprovalStatus" NOT NULL DEFAULT 'Draft',
  "Validity_Review_Status" "DocumentValidityStatus",
  "Processing_Status" "DocumentProcessingStatus",
  "Uploaded_By_ID" TEXT NOT NULL,
  "Uploaded_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "Issue_Date" TIMESTAMP(3),
  "Review_Due_Date" TIMESTAMP(3),
  "Expiry_Date" TIMESTAMP(3),
  CONSTRAINT "Document_Version_pkey" PRIMARY KEY ("Document_Version_ID"),
  CONSTRAINT "Document_Version_Document_ID_fkey" FOREIGN KEY ("Document_ID") REFERENCES "Managed_Document"("Document_ID") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_Version_Uploaded_By_ID_fkey" FOREIGN KEY ("Uploaded_By_ID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Document_Link" (
  "Document_Link_ID" TEXT NOT NULL,
  "Document_ID" TEXT NOT NULL,
  "Document_Version_ID" TEXT,
  "Pipeline_ID" TEXT,
  "Segment_ID" TEXT,
  "Asset_ID" TEXT,
  "Created_By_ID" TEXT NOT NULL,
  "Created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_Link_pkey" PRIMARY KEY ("Document_Link_ID"),
  CONSTRAINT "Document_Link_one_target_check" CHECK (num_nonnulls("Pipeline_ID", "Segment_ID", "Asset_ID") = 1),
  CONSTRAINT "Document_Link_Document_ID_fkey" FOREIGN KEY ("Document_ID") REFERENCES "Managed_Document"("Document_ID") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_Link_Document_Version_ID_fkey" FOREIGN KEY ("Document_Version_ID") REFERENCES "Document_Version"("Document_Version_ID") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_Link_Pipeline_ID_fkey" FOREIGN KEY ("Pipeline_ID") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_Link_Segment_ID_fkey" FOREIGN KEY ("Segment_ID") REFERENCES "Segment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_Link_Asset_ID_fkey" FOREIGN KEY ("Asset_ID") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_Link_Created_By_ID_fkey" FOREIGN KEY ("Created_By_ID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Document_Version_File_Hash_SHA256_key" ON "Document_Version"("File_Hash_SHA256");
CREATE UNIQUE INDEX "Document_Version_Document_ID_Document_Revision_key" ON "Document_Version"("Document_ID", "Document_Revision");
CREATE UNIQUE INDEX "Document_Link_Document_ID_Pipeline_ID_key" ON "Document_Link"("Document_ID", "Pipeline_ID");
CREATE UNIQUE INDEX "Document_Link_Document_ID_Segment_ID_key" ON "Document_Link"("Document_ID", "Segment_ID");
CREATE UNIQUE INDEX "Document_Link_Document_ID_Asset_ID_key" ON "Document_Link"("Document_ID", "Asset_ID");
CREATE INDEX "Managed_Document_Document_Family_ID_idx" ON "Managed_Document"("Document_Family_ID");
CREATE INDEX "Document_Family_Owner_ID_Created_At_idx" ON "Document_Family"("Owner_ID", "Created_At");
CREATE INDEX "Managed_Document_Owner_ID_Updated_At_idx" ON "Managed_Document"("Owner_ID", "Updated_At");
CREATE INDEX "Managed_Document_Document_Number_idx" ON "Managed_Document"("Document_Number");
CREATE INDEX "Document_Version_Document_ID_Uploaded_At_idx" ON "Document_Version"("Document_ID", "Uploaded_At");
CREATE INDEX "Document_Version_Approval_Status_Validity_Review_Status_idx" ON "Document_Version"("Approval_Status", "Validity_Review_Status");
CREATE INDEX "Document_Version_Processing_Status_idx" ON "Document_Version"("Processing_Status");
CREATE INDEX "Document_Link_Document_ID_idx" ON "Document_Link"("Document_ID");
CREATE INDEX "Document_Link_Document_Version_ID_idx" ON "Document_Link"("Document_Version_ID");
CREATE INDEX "Document_Link_Pipeline_ID_idx" ON "Document_Link"("Pipeline_ID");
CREATE INDEX "Document_Link_Segment_ID_idx" ON "Document_Link"("Segment_ID");
CREATE INDEX "Document_Link_Asset_ID_idx" ON "Document_Link"("Asset_ID");
