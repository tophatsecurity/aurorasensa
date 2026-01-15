// Aurora API - Activity & Sessions Hooks
// Based on API documentation at http://aurora.tophatsecurity.com:9151/docs
// Activity endpoints: GET /api/activity, GET /api/users/{user_id}/activity
// Sessions endpoints: GET /api/users/{user_id}/sessions
// API Keys endpoints: GET/POST /api/users/{user_id}/api-keys, DELETE /api/users/{user_id}/api-keys/{key_id}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, defaultQueryOptions } from "./core";
import { ACTIVITY, USERS, withQuery } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface ActivityEntry {
  id: string;
  timestamp: string;
  user_id?: string;
  username?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  created_at: string;
  last_active?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at?: string;
  is_current?: boolean;
}

export interface ApiKey {
  id: string;
  key_prefix: string;  // First few chars for identification
  name?: string;
  description?: string;
  created_at: string;
  last_used?: string;
  expires_at?: string;
  permissions?: string[];
}

// =============================================
// ACTIVITY HOOKS
// =============================================

export function useActivityFeed(limit: number = 50) {
  return useQuery({
    queryKey: ["aurora", "activity", limit],
    queryFn: () => callAuroraApi<{ entries: ActivityEntry[] }>(
      withQuery(ACTIVITY.FEED, { limit })
    ),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useUserActivity(userId: string, limit: number = 50) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "activity", limit],
    queryFn: () => callAuroraApi<{ entries: ActivityEntry[] }>(
      withQuery(USERS.ACTIVITY(userId), { limit })
    ),
    enabled: hasAuroraSession() && !!userId,
    ...defaultQueryOptions,
  });
}

// =============================================
// SESSIONS HOOKS
// =============================================

export function useUserSessions(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "sessions"],
    queryFn: () => callAuroraApi<{ sessions: UserSession[] }>(USERS.SESSIONS(userId)),
    enabled: hasAuroraSession() && !!userId,
    ...defaultQueryOptions,
  });
}

// =============================================
// API KEYS HOOKS
// =============================================

export function useUserApiKeys(userId: string) {
  return useQuery({
    queryKey: ["aurora", "users", userId, "api-keys"],
    queryFn: () => callAuroraApi<{ keys: ApiKey[] }>(USERS.API_KEYS(userId)),
    enabled: hasAuroraSession() && !!userId,
    ...defaultQueryOptions,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, name, description, expiresAt, permissions }: { 
      userId: string; 
      name?: string; 
      description?: string;
      expiresAt?: string;
      permissions?: string[];
    }) => {
      return callAuroraApi<{ key: string; id: string }>(USERS.API_KEYS(userId), "POST", {
        name,
        description,
        expires_at: expiresAt,
        permissions,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users", variables.userId, "api-keys"] });
    },
  });
}

export function useDeleteApiKey() {
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
