import { env } from "../config/env";

type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  user: {
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  assessment: {
    findMany(args: unknown): Promise<any[]>;
    create(args: unknown): Promise<any>;
  };
  report: {
    findMany(args: unknown): Promise<any[]>;
    findFirst(args: unknown): Promise<any>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
  };
  externalPipeData: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
  deviceRecord: {
    findMany(args: unknown): Promise<any[]>;
    findUnique(args: unknown): Promise<any>;
    create(args: unknown): Promise<any>;
    update(args: unknown): Promise<any>;
  };
};

let prismaClient: PrismaClientLike | null = null;

export function getPrismaClient(): PrismaClientLike | null {
  if (!env.databaseUrl) {
    return null;
  }

  if (!prismaClient) {
    const prismaModule = require("@prisma/client") as { PrismaClient?: new () => PrismaClientLike };
    if (!prismaModule.PrismaClient) {
      return null;
    }

    prismaClient = new prismaModule.PrismaClient();
  }

  return prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
}
