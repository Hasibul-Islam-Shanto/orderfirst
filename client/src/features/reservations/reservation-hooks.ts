import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, queryString } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { mapReservation, mapTable, type ApiReservation, type ApiResponse, type ApiTable, type PaginatedResponse } from "../../lib/api-types";

export function reservationDate(date: string, time: string) { return new Date(`${date}T${time}:00`).toISOString(); }
export function useReservationAvailability(date: string, time: string, guestCount: number) {
  const enabled = Boolean(date && time && guestCount);
  const value = enabled ? reservationDate(date, time) : "";
  return useQuery({ queryKey: queryKeys.reservations.availability({ date, time, guestCount }), enabled, queryFn: async ({ signal }) => (await apiClient.get<ApiResponse<ApiTable[]>>(`/reservations/availability${queryString({ reservationDate: value, guestCount })}`, signal)).data.map(mapTable), staleTime: 30_000 });
}
export function useMyReservations(page = 1) { return useQuery({ queryKey: queryKeys.reservations.mine({ page }), queryFn: async ({ signal }) => { const r = await apiClient.get<PaginatedResponse<ApiReservation>>(`/reservations${queryString({ page, limit: 50 })}`, signal); return { ...r, data: r.data.map(mapReservation) }; }, staleTime: 30_000 }); }
export function useReservationDetails(id?: string) { return useQuery({ queryKey: queryKeys.reservations.detail(id ?? ""), enabled: Boolean(id), queryFn: async ({ signal }) => mapReservation((await apiClient.get<ApiResponse<ApiReservation>>(`/reservations/${id}`, signal)).data), staleTime: 15_000 }); }
export function useCreateReservation() { const client = useQueryClient(); return useMutation({ mutationFn: async (input: { restaurantTableId: string; reservationDate: string; guestCount: number; specialRequest?: string }) => mapReservation((await apiClient.post<ApiResponse<ApiReservation>>("/reservations", input)).data), onSuccess: (value) => { client.invalidateQueries({ queryKey: queryKeys.reservations.all }); client.invalidateQueries({ queryKey: ["admin", "reservations"] }); client.invalidateQueries({ queryKey: queryKeys.admin.dashboard }); client.setQueryData(queryKeys.reservations.detail(value.id), value); } }); }
export function useCancelReservation() { const client = useQueryClient(); return useMutation({ mutationFn: async (id: string) => mapReservation((await apiClient.patch<ApiResponse<ApiReservation>>(`/reservations/${id}/cancel`)).data), onSuccess: (value) => { client.invalidateQueries({ queryKey: queryKeys.reservations.all }); client.setQueryData(queryKeys.reservations.detail(value.id), value); } }); }
