import bcrypt from "bcrypt";

import { getPrismaClient, disconnectPrisma } from "../lib/prisma";

type ResetAdminPasswordInput = {
  email: string;
  password: string;
};

type ResetAdminUser = {
  id: string;
  email: string;
  role: string;
  passwordHash?: string;
};

type ResetAdminUserDelegate = {
  findUnique(args: { where: { email: string }; select?: unknown }): Promise<ResetAdminUser | null>;
  update(args: { where: { email: string }; data: { passwordHash: string }; select?: unknown }): Promise<ResetAdminUser>;
};

const MIN_PASSWORD_LENGTH = 12;

export function validateResetAdminPasswordInput(input: ResetAdminPasswordInput): ResetAdminPasswordInput {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("RESET_ADMIN_EMAIL must be a valid email address.");
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "RESET_ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol."
    );
  }

  return { email, password };
}

function readFromEnv() {
  return validateResetAdminPasswordInput({
    email: process.env.RESET_ADMIN_EMAIL || "",
    password: process.env.RESET_ADMIN_PASSWORD || ""
  });
}

export async function resetAdminPasswordWithUserDelegate(
  userDelegate: ResetAdminUserDelegate,
  input: ResetAdminPasswordInput
) {
  const candidate = validateResetAdminPasswordInput(input);
  const existing = await userDelegate.findUnique({
    where: { email: candidate.email },
    select: { id: true, email: true, role: true }
  });

  if (!existing) {
    throw new Error("Password reset refused: Admin account was not found.");
  }

  if (existing.role !== "Admin") {
    throw new Error("Password reset refused: account is not an Admin.");
  }

  const passwordHash = await bcrypt.hash(candidate.password, 10);
  return userDelegate.update({
    where: { email: candidate.email },
    data: { passwordHash },
    select: { id: true, email: true, role: true }
  });
}

export async function resetAdminPassword(input: ResetAdminPasswordInput) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("DATABASE_URL must be configured before resetting an Admin password.");
  }

  return resetAdminPasswordWithUserDelegate(prisma.user, input);
}

async function main() {
  const input = readFromEnv();
  await resetAdminPassword(input);
  console.log("Admin password reset completed.");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Admin password reset failed.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectPrisma();
    });
}
