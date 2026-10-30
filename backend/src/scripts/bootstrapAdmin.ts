import bcrypt from "bcrypt";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { getPrismaClient, disconnectPrisma } from "../lib/prisma";

type BootstrapAdminInput = {
  email: string;
  name: string;
  password: string;
};

type BootstrapUserDelegate = {
  count(): Promise<number>;
  findUnique(args: { where: { email: string } }): Promise<unknown | null>;
  create(args: { data: { name: string; email: string; passwordHash: string; role: "Admin" } }): Promise<{
    id: string;
    email: string;
    role: "Admin";
  }>;
};

const MIN_PASSWORD_LENGTH = 12;

export function validateBootstrapAdminInput(input: BootstrapAdminInput): BootstrapAdminInput {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a valid email address.");
  }

  if (!name || name.length > 120) {
    throw new Error("BOOTSTRAP_ADMIN_NAME must be 1-120 characters.");
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters and include uppercase, lowercase, number, and symbol."
    );
  }

  return { email, name, password };
}

async function readFromPrompt() {
  const rl = createInterface({ input, output });

  try {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL || await rl.question("Admin email: ");
    const name = process.env.BOOTSTRAP_ADMIN_NAME || await rl.question("Admin name: ");
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || await rl.question("Admin password: ");
    return validateBootstrapAdminInput({ email, name, password });
  } finally {
    rl.close();
  }
}

export async function bootstrapFirstAdminWithUserDelegate(
  userDelegate: BootstrapUserDelegate,
  input: BootstrapAdminInput
) {
  const candidate = validateBootstrapAdminInput(input);
  const existingUserCount = await userDelegate.count();
  if (existingUserCount > 0) {
    throw new Error("Bootstrap refused: at least one user already exists.");
  }

  const existingEmail = await userDelegate.findUnique({ where: { email: candidate.email } });
  if (existingEmail) {
    throw new Error("Bootstrap refused: email already exists.");
  }

  const passwordHash = await bcrypt.hash(candidate.password, 10);
  const user = await userDelegate.create({
    data: {
      name: candidate.name,
      email: candidate.email,
      passwordHash,
      role: "Admin"
    }
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}

export async function bootstrapFirstAdmin(input: BootstrapAdminInput) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("DATABASE_URL must be configured before bootstrapping the first admin.");
  }

  return bootstrapFirstAdminWithUserDelegate(prisma.user, input);
}

async function main() {
  const input = await readFromPrompt();
  const user = await bootstrapFirstAdmin(input);
  console.log(`First admin created: ${user.email} (${user.role})`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Bootstrap failed.");
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectPrisma();
    });
}
