/**
 * Phase A — central registry of the external subject-app links.
 *
 * These four entries are the ONLY approved external learning-app targets.
 * Every entry is validated against an exact-hostname allowlist before it is
 * ever opened (see src/lib/openSubjectApp.ts); anything off spec fails closed
 * and the product is shown as unavailable rather than opened.
 *
 * This registry only changes WHERE the main entry points send students. The
 * internal legacy pages (LiteratureHubPage, ScienceIntroPage, the civics pages,
 * Larutz, etc.) stay in the codebase and remain reachable by direct URL, so a
 * rollback is a plain revert of the entry points — no content is removed.
 *
 * Not connected here, on purpose:
 *   - mind-map-learner.lovable.app — excluded (separate security incident).
 *   - ?guest=1 on ספרות 70% — never used; the canonical root is the target.
 *   - תנ״ך 30% / 70% — out of Phase A scope entirely.
 */

export type SubjectAppStatus = "active" | "coming_soon" | "disabled";

export interface SubjectApp {
  /** Stable product id used by the entry points. */
  id: string;
  /** Hebrew display name. */
  displayName: string;
  /** The canonical, https, no-query-identity URL. */
  url: string;
  /** The exact host this url must resolve to. Part of the allowlist check. */
  hostname: string;
  status: SubjectAppStatus;
}

export const SUBJECT_APPS: Record<string, SubjectApp> = {
  "literature-70": {
    id: "literature-70",
    displayName: "ספרות 70%",
    url: "https://seferut-bagrut.vercel.app/",
    hostname: "seferut-bagrut.vercel.app",
    status: "active",
  },
  "literature-30": {
    id: "literature-30",
    displayName: "ספרות 30%",
    url: "https://larutz-im-milim.web.app/#station-9",
    hostname: "larutz-im-milim.web.app",
    status: "active",
  },
  "civics-70": {
    id: "civics-70",
    displayName: "אזרחות 70%",
    url: "https://israel-civics-coach.lovable.app/",
    hostname: "israel-civics-coach.lovable.app",
    status: "active",
  },
  science: {
    id: "science",
    displayName: "מדעים",
    url: "https://science2-eta.vercel.app/",
    hostname: "science2-eta.vercel.app",
    status: "active",
  },
};

/**
 * Exact-hostname allowlist. No wildcards — a wildcard like *.vercel.app would
 * permit any site on that provider. Every host here was verified live.
 */
export const ALLOWED_SUBJECT_APP_HOSTS: readonly string[] = [
  "seferut-bagrut.vercel.app",
  "larutz-im-milim.web.app",
  "israel-civics-coach.lovable.app",
  "science2-eta.vercel.app",
];
