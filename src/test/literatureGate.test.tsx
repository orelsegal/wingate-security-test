/**
 * The literature duplicate-experience fix:
 * /subjects/ספרות must never render the internal "יחידות לימוד" view —
 * every entry redirects to the clean literature gate, which sends students
 * to the canonical apps (לרוץ עם מילים 30% / ספרות לבגרות 70%).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SubjectDetailPage from "@/pages/SubjectDetailPage";
import LiteratureHubPage from "@/pages/LiteratureHubPage";

const renderAt = (path: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/subjects/:subjectName" element={<SubjectDetailPage />} />
          <Route path="/subjects/:subjectName/literature" element={<div>LITERATURE_GATE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("ספרות redirects to the canonical gate", () => {
  it("/subjects/ספרות never shows the internal units view", () => {
    renderAt(`/subjects/${encodeURIComponent("ספרות")}`);
    expect(screen.getByText("LITERATURE_GATE")).toBeTruthy();
    expect(screen.queryByText(/יחידות לימוד/)).toBeNull();
  });

  it("other subjects still render the detail page (no over-redirect)", () => {
    renderAt(`/subjects/${encodeURIComponent("מתמטיקה")}`);
    expect(screen.queryByText("LITERATURE_GATE")).toBeNull();
  });
});

describe("אזרחות forwards to the canonical app (frozen internal view)", () => {
  const realLocation = window.location;
  afterEach(() => {
    Object.defineProperty(window, "location", { value: realLocation, writable: true, configurable: true });
  });

  it("renders the interstitial, navigates same-window, never shows internal units", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...realLocation, assign }, writable: true, configurable: true,
    });
    renderAt(`/subjects/${encodeURIComponent("אזרחות")}`);
    expect(screen.getByText(/מעבירים אתכם לאפליקציית האזרחות/)).toBeTruthy();
    expect(assign).toHaveBeenCalledWith("https://israel-civics-coach.lovable.app/");
    expect(screen.queryByText(/יחידות לימוד/)).toBeNull();
  });
});

describe("the literature gate itself", () => {
  it("offers exactly the two canonical parts, same-window, with a return hint", () => {
    render(
      <MemoryRouter initialEntries={[`/subjects/${encodeURIComponent("ספרות")}/literature`]}>
        <Routes>
          <Route path="/subjects/:subjectName/literature" element={<LiteratureHubPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/לרוץ עם מילים · 30%/)).toBeTruthy();
    expect(screen.getByText(/ספרות לבגרות · 70%/)).toBeTruthy();
    // the retired פנימי/חיצוני vocabulary must not face users
    expect(screen.queryByText(/פנימי/)).toBeNull();
    expect(screen.queryByText(/חיצוני/)).toBeNull();
    // clear same-window + return affordance, and no stale "new tab" copy
    expect(screen.getAllByText(/חזרה עם כפתור החזרה בדפדפן/).length).toBe(2);
    expect(screen.queryByText(/נפתח בטאב חדש/)).toBeNull();
    // no internal course-map content on the gate
    expect(screen.queryByText(/יחידות לימוד/)).toBeNull();
  });
});
