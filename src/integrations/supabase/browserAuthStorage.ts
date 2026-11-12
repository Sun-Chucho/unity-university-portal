// Supabase persists browser sessions on the application's own origin.
export function browserAuthStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
