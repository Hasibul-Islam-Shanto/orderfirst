import type { CartItem, MenuItem } from "../../types";

// Both cart and checkout use today's menu. Completed orders keep their snapshots.
export function resolveCartItems(
  items: CartItem[],
  menu: MenuItem[],
): CartItem[] {
  return items.map(({ item, quantity }) => ({
    quantity,
    item: menu.find((dish) => dish.id === item.id) ?? {
      ...item,
      available: false,
    },
  }));
}
