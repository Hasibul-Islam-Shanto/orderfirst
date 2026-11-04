import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { paginationArgs, uuidSchema } from '../../utils/validation.js';
import type * as validation from './menu.validation.js';

export async function getMenuCategories(query: {
  page: number;
  limit: number;
}) {
  const [data, total] = await prisma.$transaction([
    prisma.category.findMany({
      ...paginationArgs(query),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    prisma.category.count(),
  ]);
  return { data, total };
}

export async function getMenuItems(
  query: z.output<typeof validation.menuListRequest>['query'],
) {
  const where: Prisma.MenuItemWhereInput = {};
  if (query.search)
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  if (query.category)
    where.category = uuidSchema.safeParse(query.category).success
      ? { id: query.category }
      : { slug: query.category };
  if (query.available !== undefined) where.isAvailable = query.available;
  if (query.featured !== undefined) where.isFeatured = query.featured;

  const [data, total] = await prisma.$transaction([
    prisma.menuItem.findMany({
      where,
      ...paginationArgs(query),
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      include: { category: true },
    }),
    prisma.menuItem.count({ where }),
  ]);
  return { data, total };
}

export async function getMenuItemById(menuItemId: string) {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: { category: true },
  });
  if (!menuItem)
    throw new AppError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND');
  return menuItem;
}

export function createCategory(
  input: z.output<typeof validation.createCategoryRequest>['body'],
) {
  return prisma.category.create({ data: input });
}

export function updateCategory(
  categoryId: string,
  input: z.output<typeof validation.updateCategoryRequest>['body'],
) {
  return prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
    },
  });
}

export async function deleteCategory(categoryId: string) {
  await prisma.category.delete({ where: { id: categoryId } });
  return null;
}

export function createMenuItem(
  input: z.output<typeof validation.createMenuItemRequest>['body'],
) {
  return prisma.menuItem.create({ data: input, include: { category: true } });
}

export function updateMenuItem(
  menuItemId: string,
  input: z.output<typeof validation.updateMenuItemRequest>['body'],
) {
  return prisma.menuItem.update({
    where: { id: menuItemId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.preparationTimeMinutes !== undefined
        ? { preparationTimeMinutes: input.preparationTimeMinutes }
        : {}),
      ...(input.categoryId !== undefined
        ? { categoryId: input.categoryId }
        : {}),
      ...(input.isAvailable !== undefined
        ? { isAvailable: input.isAvailable }
        : {}),
      ...(input.isFeatured !== undefined
        ? { isFeatured: input.isFeatured }
        : {}),
    },
    include: { category: true },
  });
}

export async function deleteMenuItem(menuItemId: string, hard = false) {
  if (hard) {
    await prisma.menuItem.delete({ where: { id: menuItemId } });
    return { deleted: true, hard: true };
  }
  // Soft-delete sets isAvailable = false
  const updated = await prisma.menuItem.update({
    where: { id: menuItemId },
    data: { isAvailable: false },
  });
  return { deleted: true, hard: false, item: updated };
}

export function updateMenuItemAvailability(
  menuItemId: string,
  isAvailable: boolean,
) {
  return prisma.menuItem.update({
    where: { id: menuItemId },
    data: { isAvailable },
  });
}

export async function getBatchMenuItems(ids: string[]) {
  const items = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      price: true,
      isAvailable: true,
    },
  });
  return items;
}

