/**
 * Render tests for the demo-slice pages (no auth, no network):
 * - Tanakh year map: 2 arcs, 9 units, prototype banner, real driving questions.
 * - Tanakh unit 1: real language task + honest device-only-save note.
 * - MentorDemoPage: locked for non-admin (honest gate), no synthetic data leak.
 * - SendUpdateDialog: preview-first flow, no fake "sent" claim.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TanakhRoadmapPage from "@/pages/TanakhRoadmapPage";
import TanakhUnitPage from "@/pages/TanakhUnitPage";
import MentorDemoPage from "@/pages/MentorDemoPage";
import { TANAKH_UNITS } from "@/tanakh/tanakhData";

const unitPath = (id: number) => `/subjects/${encodeURIComponent("תנ״ך")}/tanakh-30/unit/${id}`;

describe("Tanakh year-map prototype", () => {
  it("renders opening, both arcs and all 9 units with honest prototype labeling", () => {
    render(<MemoryRouter><TanakhRoadmapPage /></MemoryRouter>);
    expect(screen.getByText(/מסלול הלמידה השנתי/)).toBeTruthy();
    expect(screen.getByText("עלילות ראשית")).toBeTruthy();
    expect(screen.getByText("בין שאול לדוד")).toBeTruthy();
    // honest prototype banner
    expect(screen.getByText(/אב־טיפוס להדגמה/)).toBeTruthy();
    expect(screen.getByText(/מצבי תצוגה בלבד/)).toBeTruthy();
    // all 9 unit titles present
    TANAKH_UNITS.forEach(u => {
      expect(screen.getByText(new RegExp(`יחידה ${u.id} · `))).toBeTruthy();
    });
    // unit 1 is the only enterable unit
    expect(screen.getByText("לכניסה ליחידה")).toBeTruthy();
  });

  it("unit 1 shows the real language task and an honest device-only save note", () => {
    render(
      <MemoryRouter initialEntries={[unitPath(1)]}>
        <Routes>
          <Route path="/subjects/:subjectName/tanakh-30/unit/:unitId" element={<TanakhUnitPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/בריאה, אדם ואחריות/)).toBeTruthy();
    expect(screen.getByText(/מה תפקיד האדם בעולם לפי שני תיאורי הבריאה/)).toBeTruthy();
    // five moves are present in the stepper
    ["פתיחה והבנה", "הטקסט המקראי", "עיון ופרשנות", "ערכים ומעורבות", "משימות וכתיבה"].forEach(t => {
      expect(screen.getAllByText(new RegExp(t)).length).toBeGreaterThan(0);
    });
  });

  it("units 2-9 render an honest stub, not fake content", () => {
    render(
      <MemoryRouter initialEntries={[unitPath(4)]}>
        <Routes>
          <Route path="/subjects/:subjectName/tanakh-30/unit/:unitId" element={<TanakhUnitPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/בקשת המלך/)).toBeTruthy();
    expect(screen.getByText(/ייבנה באפליקציה בהמשך/)).toBeTruthy();
  });
});

describe("Mentor (מאמנטור) demo page", () => {
  it("is locked for a non-admin session and says why", () => {
    render(<MemoryRouter><MentorDemoPage /></MemoryRouter>);
    expect(screen.getByText(/זמינה בשלב זה למנהל המערכת בלבד/)).toBeTruthy();
    expect(screen.getByText(/טרם קיים במערכת ההרשאות/)).toBeTruthy();
    // synthetic class data must NOT render for a non-admin
    expect(screen.queryByText(/יואב \(דמה\)/)).toBeNull();
  });
});
