import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // Prisma akan otomatis membaca DATABASE_URL dari .env

export default prisma;
