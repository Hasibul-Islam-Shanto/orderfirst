import { z } from "zod";

// A draft can be incomplete or have expired while signing in. The reservation
// form performs the full date and availability validation before submitting it.
const draftSchema = z.object({
  date: z.string(),
  time: z.string(),
  guests: z.number().int().min(1).max(8),
  tableId: z.string(),
  request: z.string().max(500),
});
type ReservationDraft = z.infer<typeof draftSchema>;

export function reservationAuthState(reservationDraft: ReservationDraft) {
  return { from: "/reservations/new", reservationDraft };
}

export function readReservationDraft(
  state: unknown,
): ReservationDraft | undefined {
  const result = z.object({ reservationDraft: draftSchema }).safeParse(state);
  return result.success ? result.data.reservationDraft : undefined;
}
