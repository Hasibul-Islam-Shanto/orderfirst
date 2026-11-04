import { describe, it, expect } from 'vitest';
import {
  menuListRequest,
  updateMenuItemRequest,
  createMenuItemRequest,
  createCategoryRequest,
  batchLookupRequest,
} from '../src/modules/menu/menu.validation.js';

const resourceId = '10000000-0000-4000-8000-000000000001';

describe('Catalog validation invariants', () => {
  it('preserves false query values and coerces pagination', () => {
    expect(
      menuListRequest.parse({
        query: { available: 'false', featured: 'true', page: '2', limit: '10' },
      }).query,
    ).toMatchObject({ available: false, featured: true, page: 2, limit: 10 });

    for (const query of [
      { limit: '101' },
      { page: '0' },
      { available: 'yes' },
      { search: ['one', 'two'] },
    ]) {
      expect(menuListRequest.safeParse({ query }).success).toBe(false);
    }
  });

  it('does not reset availability on partial menu updates', () => {
    expect(
      updateMenuItemRequest.parse({
        params: { menuItemId: resourceId },
        body: { price: 15.5 },
      }).body,
    ).toEqual({ price: 15.5 });
  });

  it('validates category slug format', () => {
    expect(
      createCategoryRequest.safeParse({
        body: { name: 'Desserts', slug: 'desserts-and-sweets' },
      }).success,
    ).toBe(true);

    expect(
      createCategoryRequest.safeParse({
        body: { name: 'Desserts', slug: 'Invalid Slug!' },
      }).success,
    ).toBe(false);
  });

  it('validates menu item price, image URL and prep time', () => {
    const validItem = {
      name: 'Signature Burger',
      description: 'Delicious prime beef burger with cheddar',
      price: 14.99,
      imageUrl: 'https://images.orderfirst.test/burger.jpg',
      preparationTimeMinutes: 15,
      categoryId: resourceId,
    };

    expect(createMenuItemRequest.safeParse({ body: validItem }).success).toBe(
      true,
    );

    // Negative price
    expect(
      createMenuItemRequest.safeParse({
        body: { ...validItem, price: -5 },
      }).success,
    ).toBe(false);

    // Non-https image
    expect(
      createMenuItemRequest.safeParse({
        body: { ...validItem, imageUrl: 'http://images.test/burger.jpg' },
      }).success,
    ).toBe(false);

    // Prep time 0
    expect(
      createMenuItemRequest.safeParse({
        body: { ...validItem, preparationTimeMinutes: 0 },
      }).success,
    ).toBe(false);
  });

  it('validates batch menu item lookup payload', () => {
    expect(
      batchLookupRequest.safeParse({
        body: { ids: [resourceId] },
      }).success,
    ).toBe(true);

    expect(
      batchLookupRequest.safeParse({
        body: { ids: [] },
      }).success,
    ).toBe(false);

    expect(
      batchLookupRequest.safeParse({
        body: { ids: ['invalid-uuid'] },
      }).success,
    ).toBe(false);
  });
});

