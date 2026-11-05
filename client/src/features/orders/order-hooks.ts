import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, queryString } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { mapOrder, type ApiOrder, type ApiResponse, type PaginatedResponse } from "../../lib/api-types";

export function useMyOrders(page = 1) {
  return useQuery({ queryKey: queryKeys.orders.mine({ page }), queryFn: async ({ signal }) => { const r = await apiClient.get<PaginatedResponse<ApiOrder>>(`/orders${queryString({ page, limit: 50 })}`, signal); return { ...r, data: r.data.map(mapOrder) }; }, staleTime: 20_000 });
}
export function useOrderDetails(id?: string) {
  return useQuery({ queryKey: queryKeys.orders.detail(id ?? ""), enabled: Boolean(id), queryFn: async ({ signal }) => mapOrder((await apiClient.get<ApiResponse<ApiOrder>>(`/orders/${id}`, signal)).data), refetchInterval: (query) => query.state.data && !["Completed", "Cancelled"].includes(query.state.data.status) ? 10_000 : false, staleTime: 8_000 });
}
export function useCreateOrder() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (input: { orderType: "DINE_IN" | "PICKUP"; notes?: string; items: { menuItemId: string; quantity: number }[] }) => mapOrder((await apiClient.post<ApiResponse<ApiOrder>>("/orders", input)).data), onSuccess: (order) => { client.invalidateQueries({ queryKey: queryKeys.orders.all }); client.setQueryData(queryKeys.orders.detail(order.id), order); } });
}
