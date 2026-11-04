import type { Request, Response } from 'express';
import type { z } from 'zod';
import type * as validation from './menu.validation.js';
import * as service from './menu.service.js';
import { sendSuccess, sendList } from '../../utils/response.js';

export async function getMenuCategories(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.categoryListRequest>,
) {
  return sendList(
    response,
    await service.getMenuCategories(input.query),
    input.query.page,
    input.query.limit,
    'Categories retrieved successfully',
  );
}

export async function getMenuItems(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.menuListRequest>,
) {
  return sendList(
    response,
    await service.getMenuItems(input.query),
    input.query.page,
    input.query.limit,
    'Menu items retrieved successfully',
  );
}

export async function getMenuItemById(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.menuItemRequest>,
) {
  return sendSuccess(
    response,
    await service.getMenuItemById(input.params.menuItemId),
    'Menu item retrieved successfully',
  );
}

export async function createCategory(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.createCategoryRequest>,
) {
  return sendSuccess(
    response,
    await service.createCategory(input.body),
    'Category created successfully',
    201,
  );
}

export async function updateCategory(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.updateCategoryRequest>,
) {
  return sendSuccess(
    response,
    await service.updateCategory(input.params.categoryId, input.body),
    'Category updated successfully',
  );
}

export async function deleteCategory(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.categoryRequest>,
) {
  return sendSuccess(
    response,
    await service.deleteCategory(input.params.categoryId),
    'Category deleted successfully',
  );
}

export async function createMenuItem(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.createMenuItemRequest>,
) {
  return sendSuccess(
    response,
    await service.createMenuItem(input.body),
    'Menu item created successfully',
    201,
  );
}

export async function updateMenuItem(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.updateMenuItemRequest>,
) {
  return sendSuccess(
    response,
    await service.updateMenuItem(input.params.menuItemId, input.body),
    'Menu item updated successfully',
  );
}

export async function deleteMenuItem(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.deleteMenuItemRequest>,
) {
  const isHard = input.query?.hard === 'true';
  const result = await service.deleteMenuItem(input.params.menuItemId, isHard);
  return sendSuccess(
    response,
    result,
    isHard ? 'Menu item permanently deleted' : 'Menu item soft-deleted (marked unavailable)',
  );
}

export async function updateMenuItemAvailability(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.menuAvailabilityRequest>,
) {
  return sendSuccess(
    response,
    await service.updateMenuItemAvailability(
      input.params.menuItemId,
      input.body.isAvailable,
    ),
    'Availability updated successfully',
  );
}

export async function getBatchMenuItems(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.batchLookupRequest>,
) {
  const items = await service.getBatchMenuItems(input.body.ids);
  return response.json(items);
}

