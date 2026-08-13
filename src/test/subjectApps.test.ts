import { describe, it, expect, vi, afterEach } from "vitest";
import {
  SUBJECT_APPS,
  ALLOWED_SUBJECT_APP_HOSTS,
} from "@/data/subjectApps";
import {
  safeSubjectAppUrl,
  subjectAppUrl,
  isSubjectAppAvailable,
  openSubjectApp,
} from "@/lib/openSubjectApp";

/** The exact URLs each entry point must lead to (Phase A canonical targets). */
const EXPECTED: Record<string, string> = {
  "literature-70": "https://seferut-bagrut.vercel.app/",
  "literature-30": "https://larutz-im-milim.web.app/#station-9",
  "civics-70": "https://israel-civics-coach.lovable.app/",
  science: "https://science2-eta.vercel.app/",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("subject-app registry — exact canonical URLs", () => {
  it("has exactly the four approved products", () => {
    expect(Object.keys(SUBJECT_APPS).sort()).toEqual(
      ["civics-70", "literature-30", "literature-70", "science"],
    );
  });

  for (const [id, url] of Object.entries(EXPECTED)) {
    it(`${id} resolves to the exact approved URL`, () => {
      expect(subjectAppUrl(id)).toBe(url);
      expect(isSubjectAppAvailable(id)).toBe(true);
    });
  }

  it("ספרות 70% never carries ?guest=1", () => {
    expect(subjectAppUrl("literature-70")).not.toContain("guest");
  });

  it("mind-map-learner is not in the allowlist and has no registry entry", () => {
    expect(ALLOWED_SUBJECT_APP_HOSTS).not.toContain("mind-map-learner.lovable.app");
    expect(SUBJECT_APPS["mind-map-learner"]).toBeUndefined();
  });

  it("the allowlist is exact hosts only — no wildcards", () => {
    for (const host of ALLOWED_SUBJECT_APP_HOSTS) {
      expect(host).not.toContain("*");
    }
  });
});

describe("safeSubjectAppUrl — fails closed", () => {
  const base = SUBJECT_APPS["literature-70"];

  it("rejects a missing app", () => {
    expect(safeSubjectAppUrl(undefined)).toBeNull();
  });

  it("rejects a non-active status", () => {
    expect(safeSubjectAppUrl({ ...base, status: "coming_soon" })).toBeNull();
    expect(safeSubjectAppUrl({ ...base, status: "disabled" })).toBeNull();
  });

  it("rejects http (non-https)", () => {
    expect(
      safeSubjectAppUrl({ ...base, url: "http://seferut-bagrut.vercel.app/" }),
    ).toBeNull();
  });

  it("rejects a host outside the allowlist even if it looks similar", () => {
    expect(
      safeSubjectAppUrl({
        ...base,
        url: "https://seferut-bagrut.vercel.app.evil.com/",
        hostname: "seferut-bagrut.vercel.app.evil.com",
      }),
    ).toBeNull();
  });

  it("rejects a url whose real host disagrees with the declared hostname", () => {
    expect(
      safeSubjectAppUrl({ ...base, url: "https://evil.example/" }),
    ).toBeNull();
  });

  it("rejects embedded credentials", () => {
    expect(
      safeSubjectAppUrl({
        ...base,
        url: "https://user:pass@seferut-bagrut.vercel.app/",
      }),
    ).toBeNull();
  });

  it("rejects a nested redirect target in the query", () => {
    expect(
      safeSubjectAppUrl({
        ...base,
        url: "https://seferut-bagrut.vercel.app/?redirect=https://evil.example",
      }),
    ).toBeNull();
  });
});

describe("openSubjectApp — isolated new tab", () => {
  it("opens the exact URL with noopener,noreferrer and returns true", () => {
    const spy = vi.spyOn(window, "open").mockImplementation(() => null);
    const ok = openSubjectApp("civics-70");
    expect(ok).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      "https://israel-civics-coach.lovable.app/",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("does nothing and returns false for an unknown / excluded product", () => {
    const spy = vi.spyOn(window, "open").mockImplementation(() => null);
    expect(openSubjectApp("mind-map-learner")).toBe(false);
    expect(openSubjectApp("tanakh-70")).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
