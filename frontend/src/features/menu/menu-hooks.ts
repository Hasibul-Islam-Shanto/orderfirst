import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient, queryString } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { mapCategory, mapMenuItem, type ApiCategory, type ApiMenuItem, type ApiResponse, type PaginatedResponse } from "../../lib/api-types";

export interface MenuFilters { search?: string; category?: string; available?: boolean; featured?: boolean; limit?: number }
export function useMenuCategories() {
  return useQuery({ queryKey: queryKeys.menu.categories, queryFn: async ({ signal }) => (await apiClient.get<PaginatedResponse<ApiCategory>>("/menu/categories?page=1&limit=100", signal)).data.map(mapCategory), staleTime: 10 * 60_000 });
}
export function useMenuItems(filters: MenuFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.menu.list(filters),
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const response = await apiClient.get<PaginatedResponse<ApiMenuItem>>(`/menu/items${queryString({ ...filters, page: pageParam, limit: filters.limit ?? 12 })}`, signal);
      return { ...response, data: response.data.map(mapMenuItem) };
    },
    getNextPageParam: (last) => last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    staleTime: 2 * 60_000,
  });
}
export function useMenuItem(id?: string) {
  return useQuery({ queryKey: queryKeys.menu.detail(id ?? ""), enabled: Boolean(id), queryFn: async ({ signal }) => mapMenuItem((await apiClient.get<ApiResponse<ApiMenuItem>>(`/menu/items/${id}`, signal)).data), staleTime: 2 * 60_000 });
}
