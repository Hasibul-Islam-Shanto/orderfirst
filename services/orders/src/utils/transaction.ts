import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';

export async function serializableTransaction<Result>(
  operation: (transaction: Prisma.TransactionClient) => Promise<Result>,
): Promise<Result> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2034'
      )
        throw error;
    }
  }
  throw new AppError(
    409,
    'Another request changed this resource. Please try again.',
    'WRITE_CONFLICT',
  );
}

