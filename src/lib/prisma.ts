import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function createPrismaClient() {
  const pool = globalForPrisma.pool ?? new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 5, // Limit max connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  if (!globalForPrisma.pool) globalForPrisma.pool = pool;
  
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always cache in production for serverless
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  globalForPrisma.prisma = prisma;
}

export default prisma;
