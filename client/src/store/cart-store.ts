import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, MenuItem } from "../types";
interface CartState {
  items: CartItem[];
  add: (item: MenuItem, quantity?: number) => void;
  update: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, quantity = 1) =>
        set((s) => ({
          items: s.items.some((i) => i.item.id === item.id)
            ? s.items.map((i) =>
                i.item.id === item.id
                  ? { ...i, quantity: Math.min(20, i.quantity + quantity) }
                  : i,
              )
            : [...s.items, { item, quantity: Math.min(20, quantity) }],
        })),
      update: (id, quantity) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.item.id === id
              ? { ...i, quantity: Math.max(1, Math.min(20, quantity)) }
              : i,
          ),
        })),
      remove: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.item.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "orderfirst-cart" },
  ),
);
