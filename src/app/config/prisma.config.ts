import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { envVars } from './env';

const adapter = new PrismaPg({
  connectionString: envVars.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
});
