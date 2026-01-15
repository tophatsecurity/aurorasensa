// Aurora API - Users domain hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";
import { USERS, ROLES, PERMISSIONS, ACTIVITY, AUTH, withQuery } from "./endpoints";

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
    queryFn: () => callAuroraApi<{ users: User[] }>(USERS.LIST),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId],
    queryFn: () => callAuroraApi<User>(USERS.GET(userId)),
    enabled: !!userId && hasAuroraSession(),
    retry: 2,
  });
}

export function useUserApiKeys(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "api-keys"],
    queryFn: () => callAuroraApi<{ api_keys: UserApiKey[] }>(USERS.API_KEYS(userId)),
    enabled: !!userId && hasAuroraSession(),
    retry: 2,
  });
}

export function useUserSessions(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "sessions"],
    queryFn: () => callAuroraApi<{ sessions: UserSession[] }>(USERS.SESSIONS(userId)),
    enabled: !!userId && hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["aurora", "roles"],
    queryFn: () => callAuroraApi<{ roles: Role[] }>(ROLES.LIST),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    retry: 2,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ["aurora", "permissions"],
    queryFn: () => callAuroraApi<{ permissions: Permission[] }>(PERMISSIONS.LIST),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    retry: 2,
  });
}

export function useUserRoles(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "roles"],
    queryFn: () => callAuroraApi<{ roles: Role[] }>(USERS.ROLES(userId)),
    enabled: !!userId && hasAuroraSession(),
    retry: 2,
  });
}

export function useUserPermissions(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "permissions"],
    queryFn: () => callAuroraApi<{ permissions: Permission[] }>(USERS.PERMISSIONS(userId)),
    enabled: !!userId && hasAuroraSession(),
    retry: 2,
  });
}

export function useActivityLog(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "activity", limit],
    queryFn: () => callAuroraApi<ActivityLogResponse>(
      withQuery(ACTIVITY.FEED, { limit })
    ),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useUserActivityLog(userId: string, limit: number = 50) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "activity", limit],
    queryFn: () => callAuroraApi<ActivityLogResponse>(
      withQuery(USERS.ACTIVITY(userId), { limit })
    ),
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
      return callAuroraApi<{ success: boolean; message: string }>(USERS.CREATE, "POST", user);
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
      return callAuroraApi<{ success: boolean }>(USERS.UPDATE(userId), "PUT", data);
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
      return callAuroraApi<{ success: boolean; message: string }>(USERS.DELETE(username), "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      return callAuroraApi<{ success: boolean; message: string }>(AUTH.CHANGE_PASSWORD, "POST", data);
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
      return callAuroraApi<{ success: boolean; api_key?: string; key_id?: string }>(
        USERS.API_KEYS(userId), "POST", { name }
      );
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
      return callAuroraApi<{ success: boolean }>(USERS.DELETE_API_KEY(userId, keyId), "DELETE");
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
      return callAuroraApi<{ success: boolean }>(USERS.ROLES(userId), "POST", { role_id: roleId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "roles"] });
    },
  });
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      return callAuroraApi<{ success: boolean }>(USERS.DELETE_ROLE(userId, roleId), "DELETE");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "roles"] });
    },
  });
}

export function useAssignUserPermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      return callAuroraApi<{ success: boolean }>(
        USERS.PERMISSIONS(userId), "POST", { permission_id: permissionId }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "permissions"] });
    },
  });
}

export function useRemoveUserPermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      return callAuroraApi<{ success: boolean }>(USERS.DELETE_PERMISSION(userId, permissionId), "DELETE");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "permissions"] });
    },
  });
}

export function useDeleteUserSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, sessionId }: { userId: string; sessionId: string }) => {
      return callAuroraApi<{ success: boolean }>(USERS.DELETE_SESSION(userId, sessionId), "DELETE");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "sessions"] });
    },
  });
}

export function useDeleteAllUserSessions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return callAuroraApi<{ success: boolean; deleted_count?: number }>(USERS.SESSIONS(userId), "DELETE");
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", userId, "sessions"] });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(USERS.ACTIVATE(userId), "POST");
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", userId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(USERS.DEACTIVATE(userId), "POST");
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", userId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

export function usePatchUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<User> }) => {
      return callAuroraApi<{ success: boolean }>(USERS.PATCH(userId), "PATCH", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

// =============================================
// ROLE MANAGEMENT MUTATIONS
// =============================================

export function useCreateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (role: { name: string; description?: string; permissions?: string[] }) => {
      return callAuroraApi<{ success: boolean; role_id?: string }>(ROLES.CREATE, "POST", role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roleId, data }: { roleId: string; data: Partial<Role> }) => {
      return callAuroraApi<{ success: boolean }>(ROLES.UPDATE(roleId), "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "roles"] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (roleId: string) => {
      return callAuroraApi<{ success: boolean }>(ROLES.DELETE(roleId), "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "roles"] });
    },
  });
}

export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: ["aurora", "roles", roleId, "permissions"],
    queryFn: () => callAuroraApi<{ permissions: Permission[] }>(ROLES.PERMISSIONS(roleId)),
    enabled: !!roleId && hasAuroraSession(),
    retry: 2,
  });
}

export function useAssignRolePermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      return callAuroraApi<{ success: boolean }>(
        ROLES.PERMISSIONS(roleId), "POST", { permission_ids: permissionIds }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "roles", variables.roleId, "permissions"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "roles"] });
    },
  });
}
