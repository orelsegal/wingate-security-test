/**
 * Phase A — the single safe gateway for opening an external subject app.
 *
 * Every open goes through validation first, and every open is isolated with
 * `noopener,noreferrer`. No identity, token, uid or email is ever appended to
 * the URL. URLs are never assembled by string concatenation at click time —
 * they come verbatim from the registry and are parsed once.
 */
import {
  SUBJECT_APPS,
  ALLOWED_SUBJECT_APP_HOSTS,
  type SubjectApp,
} from "@/data/subjectApps";

/** Rejects a nested redirect target smuggled through the query or hash. */
const NESTED_REDIRECT = /(https?%3a|https?:\/\/|[?&#](url|redirect|next|return|dest|target)=)/i;

/**
 * Returns the safe, canonical URL string for an app, or null (fail-closed)
 * when anything is off spec:
 *   - the app is missing or not `active`
 *   - protocol is not https:
 *   - a username/password is embedded in the URL
 *   - the hostname is not an exact match for the registry + the allowlist
 *   - the query/hash smuggles a nested redirect target
 */
export function safeSubjectAppUrl(app: SubjectApp | undefined): string | null {
  if (!app || app.status !== "active") return null;

  let parsed: URL;
  try {
    parsed = new URL(app.url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.hostname !== app.hostname) return null;
  if (!ALLOWED_SUBJECT_APP_HOSTS.includes(parsed.hostname)) return null;
  if (NESTED_REDIRECT.test(parsed.search + " " + parsed.hash)) return null;

  return parsed.toString();
}

export function getSubjectApp(id: string): SubjectApp | undefined {
  return SUBJECT_APPS[id];
}

/** Whether a product can be opened right now (passes validation). */
export function isSubjectAppAvailable(id: string): boolean {
  return safeSubjectAppUrl(SUBJECT_APPS[id]) !== null;
}

/** The validated URL for a product id, or null if unavailable. */
export function subjectAppUrl(id: string): string | null {
  return safeSubjectAppUrl(SUBJECT_APPS[id]);
}

/**
 * Opens an approved subject app in a new tab, isolated with noopener/noreferrer.
 * Returns false and does nothing if the entry is invalid/unavailable, so a
 * caller can reflect availability in the UI instead of producing a dead click.
 */
export function openSubjectApp(id: string): boolean {
  const url = safeSubjectAppUrl(SUBJECT_APPS[id]);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
