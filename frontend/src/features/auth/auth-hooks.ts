import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { mapUser, type ApiResponse, type ApiUser } from "../../lib/api-types";

export type AuthInput = { email: string; password: string };
export type RegisterInput = AuthInput & { name: string };

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.current,
    queryFn: async () =>
      mapUser((await apiClient.get<ApiResponse<ApiUser>>("/auth/me")).data),
    staleTime: 30_000,
    retry: false,
    throwOnError: false,
    select: (user) => user,
  });
}

function useAuthMutation(path: "/auth/login" | "/auth/register") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: AuthInput | RegisterInput) =>
      mapUser((await apiClient.post<ApiResponse<ApiUser>>(path, input)).data),
    onSuccess: (user) => client.setQueryData(queryKeys.auth.current, user),
  });
}
export const useLogin = () => useAuthMutation("/auth/login");
export const useRegister = () => useAuthMutation("/auth/register");

export function useVerifyEmail() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) =>
      mapUser(
        (
          await apiClient.post<ApiResponse<ApiUser>>("/auth/verify-email", {
            code,
          })
        ).data,
      ),
    onSuccess: (user) => client.setQueryData(queryKeys.auth.current, user),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<ApiResponse<null>>("/auth/resend-verification", {}),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ApiResponse<null>>("/auth/logout"),
    onSuccess: () => {
      client.setQueryData(queryKeys.auth.current, null);
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "menu",
      });
    },
  });
}

export function isUnauthenticated(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}
