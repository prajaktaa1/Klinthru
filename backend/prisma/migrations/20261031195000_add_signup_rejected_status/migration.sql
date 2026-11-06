-- Add the explicit rejected-signup state without changing existing rows.
ALTER TYPE "CompanyStatus" ADD VALUE IF NOT EXISTS 'SignupRejected';
