// Aurora API - Users domain hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";

// =============================================
// TYPES
// =============================================

export interface User {
  id?: string;
  username: string;
  role?: string;
  email?: string;
  created_at?: string;
  last_login?: string;
  is_active?: boolean;
}

export interface UserApiKey {
  id: string;
  name?: string;
  created_at: string;
  last_used?: string;
  prefix?: string;
}

export interface UserSession {
  id: string;
  created_at: string;
  last_active?: string;
  ip_address?: string;
  user_agent?: string;
  current?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface ActivityLogEntry {
  id?: string;
  timestamp: string;
  user?: string;
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

export interface ActivityLogResponse {
  count: number;
  entries: ActivityLogEntry[];
}

// =============================================
// QUERY HOOKS
// =============================================

export function useUsers() {
  return useQuery({
    queryKey: ["aurora", "users"],
    queryFn: () => callAuroraApi<{ users: User[] }>("/api/users"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId],
    queryFn: () => callAuroraApi<User>(`/api/users/${userId}`),
    enabled: !!userId && hasAuroraSession(),
    retry: 2,
  });
}

export function useUserApiKeys(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "api-keys"],
    queryFn: () => callAuroraApi<{ api_keys: UserApiKey[] }>(`/api/users/${userId}/api-keys`),
    enabled: !!userId && hasAuroraSession(),
    retry: 2,
  });
}

export function useUserSessions(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "sessions"],
    queryFn: () => callAuroraApi<{ sessions: UserSession[] }>(`/api/users/${userId}/sessions`),
    enabled: !!userId && hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["aurora", "roles"],
    queryFn: () => callAuroraApi<{ roles: Role[] }>("/api/roles"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    retry: 2,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ["aurora", "permissions"],
    queryFn: () => callAuroraApi<{ permissions: Permission[] }>("/api/permissions"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    retry: 2,
  });
}

export function useUserRoles(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "roles"],
    queryFn: () => callAuroraApi<{ roles: Role[] }>(`/api/users/${userId}/roles`),
    enabled: !!userId && hasAuroraSession(),
    retry: 2,
  });
}

export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "permissions"],
    queryFn: () => callAuroraApi<{ permissions: Permission[] }>(`/api/users/${userId}/permissions`),
    enabled: !!userId && hasAuroraSession(),
    retry: 2,
  });
}

export function useActivityLog(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "activity", limit],
    queryFn: () => callAuroraApi<ActivityLogResponse>(`/api/activity?limit=${limit}`),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useUserActivityLog(userId: string, limit: number = 50) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "activity", limit],
    queryFn: () => callAuroraApi<ActivityLogResponse>(`/api/users/${userId}/activity?limit=${limit}`),
    enabled: !!userId && hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 2,
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (user: { username: string; password: string; role?: string }) => {
      return callAuroraApi<{ success: boolean; message: string }>("/api/users", "POST", user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<User> }) => {
      return callAuroraApi<{ success: boolean }>(`/api/users/${userId}`, "PUT", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (username: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/users/${username}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      return callAuroraApi<{ success: boolean; message: string }>("/api/auth/change-password", "POST", data);
    },
  });
}

export function useChangeUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return callAuroraApi<{ success: boolean }>(`/api/users/${userId}/password`, "POST", { 
        new_password: newPassword 
      });
    },
  });
}

export function useCreateUserApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name?: string }) => {
      return callAuroraApi<{ success: boolean; api_key?: string; key_id?: string }>(`/api/users/${userId}/api-keys`, "POST", { name });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "api-keys"] });
    },
  });
}

export function useDeleteUserApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, keyId }: { userId: string; keyId: string }) => {
      return callAuroraApi<{ success: boolean }>(`/api/users/${userId}/api-keys/${keyId}`, "DELETE");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "api-keys"] });
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      return callAuroraApi<{ success: boolean }>(`/api/users/${userId}/roles`, "POST", { role_id: roleId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "roles"] });
    },
  });
}
