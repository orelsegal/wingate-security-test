import type { Session } from "./types";

/**
 * Demo session only — a local role switch, not authentication.
 * A real subject app replaces this with the product's own sign-in.
 */
const KEY = "wgl:session";

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage blocked — session stays in memory for this tab only */
  }
}
