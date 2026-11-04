import { Router } from 'express';
import * as controller from './menu.controller.js';
import * as validation from './menu.validation.js';
import { validateRequest } from '../../middlewares/validate-request.js';
import { requireAdmin } from '../../middlewares/auth-guard.js';

export const menuRouter = Router();

// Public routes
menuRouter.get(
  '/categories',
  validateRequest(validation.categoryListRequest, controller.getMenuCategories),
);

menuRouter.get(
  '/items',
  validateRequest(validation.menuListRequest, controller.getMenuItems),
);

menuRouter.get(
  '/items/:menuItemId',
  validateRequest(validation.menuItemRequest, controller.getMenuItemById),
);

// Admin routes under /menu
menuRouter.post(
  '/categories',
  requireAdmin,
  validateRequest(validation.createCategoryRequest, controller.createCategory),
);

menuRouter.patch(
  '/categories/:categoryId',
  requireAdmin,
  validateRequest(validation.updateCategoryRequest, controller.updateCategory),
);

menuRouter.delete(
  '/categories/:categoryId',
  requireAdmin,
  validateRequest(validation.categoryRequest, controller.deleteCategory),
);

menuRouter.post(
  '/items',
  requireAdmin,
  validateRequest(validation.createMenuItemRequest, controller.createMenuItem),
);

menuRouter.patch(
  '/items/:menuItemId',
  requireAdmin,
  validateRequest(validation.updateMenuItemRequest, controller.updateMenuItem),
);

menuRouter.delete(
  '/items/:menuItemId',
  requireAdmin,
  validateRequest(validation.deleteMenuItemRequest, controller.deleteMenuItem),
);

menuRouter.patch(
  '/items/:menuItemId/availability',
  requireAdmin,
  validateRequest(
    validation.menuAvailabilityRequest,
    controller.updateMenuItemAvailability,
  ),
);

