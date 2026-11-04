import { prisma } from '../../config/prisma.js';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

export function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });
}

