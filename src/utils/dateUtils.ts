import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

/**
 * Safely parse a date string and return a Date object or null if invalid
 */
export const safeParseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    // Try parsing as ISO string first
    const parsed = parseISO(dateString);
    if (isValid(parsed)) return parsed;
    
    // Fallback to Date constructor
    const date = new Date(dateString);
    if (isValid(date)) return date;
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Format a date string to locale string, with fallback
 */
export const formatDateTime = (dateString: string | null | undefined, fallback: string = "—"): string => {
  const date = safeParseDate(dateString);
  if (!date) return fallback;
  
  try {
    return format(date, "MMM d, yyyy HH:mm");
  } catch {
    return fallback;
  }
};

/**
 * Format a date string to locale date only, with fallback
 */
export const formatDate = (dateString: string | null | undefined, fallback: string = "—"): string => {
  const date = safeParseDate(dateString);
  if (!date) return fallback;
  
  try {
    return format(date, "MMM d, yyyy");
  } catch {
    return fallback;
  }
};

/**
 * Format a date string to time only, with fallback
 */
export const formatTime = (dateString: string | null | undefined, fallback: string = "—"): string => {
  const date = safeParseDate(dateString);
  if (!date) return fallback;
  
  try {
    return format(date, "HH:mm:ss");
  } catch {
    return fallback;
  }
};

/**
 * Format relative time (e.g., "5 minutes ago"), with fallback
 */
export const formatRelativeTime = (dateString: string | null | undefined, fallback: string = "—"): string => {
  const date = safeParseDate(dateString);
  if (!date) return fallback;
  
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return fallback;
  }
};

/**
 * Format last seen with smart relative time
 */
export const formatLastSeen = (dateString: string | null | undefined, fallback: string = "—"): string => {
  const date = safeParseDate(dateString);
  if (!date) return fallback;
  
  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(date, "MMM d");
  } catch {
    return fallback;
  }
};

/**
 * Get device status based on last seen time
 */
export const getDeviceStatusFromLastSeen = (dateString: string | null | undefined): 'online' | 'stale' | 'offline' => {
  const date = safeParseDate(dateString);
  if (!date) return 'offline';
  
  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 5) return 'online';
    if (diffMins < 60) return 'stale';
    return 'offline';
  } catch {
    return 'offline';
  }
};