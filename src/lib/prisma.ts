import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Create a .env file with DATABASE_URL for local development.");
  }

  // Create a single pool instance
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new pg.Pool({
    connectionString,
      max: 1, // Single connection for serverless
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  }
  
  const adapter = new PrismaPg(globalForPrisma.pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache in all environments for serverless
  globalForPrisma.prisma = prisma;

export default prisma;
