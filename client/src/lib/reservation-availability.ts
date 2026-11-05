import type { Reservation, RestaurantTable } from "../types";
export function availableTables(
  tables: RestaurantTable[],
  reservations: Reservation[],
  date: string,
  time: string,
  guests: number,
  excludeId?: string,
) {
  const start = new Date(`${date}T${time}:00`).getTime();
  return tables.filter(
    (t) =>
      t.available &&
      t.capacity >= guests &&
      !reservations.some(
        (r) =>
          r.id !== excludeId &&
          r.tableId === t.id &&
          r.date === date &&
          !["Cancelled", "Completed"].includes(r.status) &&
          Math.abs(new Date(`${r.date}T${r.time}:00`).getTime() - start) <
            90 * 60 * 1000,
      ),
  );
}
export const isUpcoming = (r: Reservation) =>
  !["Cancelled", "Completed"].includes(r.status) &&
  new Date(`${r.date}T${r.time}:00`).getTime() >= Date.now();
