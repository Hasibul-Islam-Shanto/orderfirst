import { create } from "zustand";
import { persist } from "zustand/middleware";
export type Theme = "light" | "dark";

const initialTheme: Theme =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

export const useTheme = create<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>()(
  persist(
    (set) => ({ theme: initialTheme, setTheme: (theme) => set({ theme }) }),
    {
      name: "orderfirst-theme",
      // Existing "system" preferences become a concrete light/dark choice.
      merge: (persisted, current) => {
        const savedTheme =
          persisted && typeof persisted === "object" && "theme" in persisted
            ? persisted.theme
            : undefined;
        return {
          ...current,
          theme:
            savedTheme === "light" || savedTheme === "dark"
              ? savedTheme
              : initialTheme,
        };
      },
    },
  ),
);
