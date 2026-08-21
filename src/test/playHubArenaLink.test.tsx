/**
 * האב (/play) חייב להוביל לזירת המשחקים של תנ״ך.
 * הבדיקה מבודדת את האב מרשת ומאימות: כל מקורות הנתונים מדומים, כדי
 * שהבדיקה תיפול רק אם הקישור עצמו נשבר.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "student", name: "בדיקה", scopeFilter: ["s1"] } }),
}));
vi.mock("@/hooks/useStudents", () => ({
  useStudent: () => ({ data: { id: "s1", full_name: "בדיקה", class_name: "ג׳", avg_score: 80, completion_percent: 50 } }),
  useStudentProgress: () => ({ data: [] }),
  useClassLeaderboard: () => ({ data: [] }),
}));
vi.mock("@/lib/dailyChallenge", () => ({
  getTodayChallenge: () => null,
  wasPopupSeenToday: () => true,
  markPopupSeen: vi.fn(),
  hasPlayedToday: () => true,
}));
vi.mock("@/lib/dailyQuiz", () => ({
  getStudentStreakPoints: () => Promise.resolve(0),
  totalSchoolDays: () => 180,
}));
vi.mock("@/lib/blitzGames", () => ({ listPublishedBlitzGames: () => [] }));

import PlayHubPage from "@/pages/PlayHubPage";

const renderHub = () =>
  render(
    <MemoryRouter initialEntries={["/play"]}>
      <Routes>
        <Route path="/play" element={<PlayHubPage />} />
        {/* תבנית הפרמטר, לא מחרוזת מקודדת: React Router משווה מול נתיב מפוענח */}
        <Route path="/subjects/:subjectName/tanakh-30/arena" element={<div>TANAKH_ARENA</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

describe("play hub links to the Tanakh arena", () => {
  it("shows the arena card with an honest demo label", () => {
    renderHub();
    expect(screen.getByText("זירות מקצוע")).toBeTruthy();
    expect(screen.getByText(/תנ״ך — זירת המשחקים/)).toBeTruthy();
    expect(screen.getByText(/גרסת הדגמה · התוצאות נשמרות במכשיר/)).toBeTruthy();
  });

  it("navigates to the arena route, not somewhere else", () => {
    renderHub();
    fireEvent.click(screen.getByText("לזירה"));
    expect(screen.getByText("TANAKH_ARENA")).toBeTruthy();
  });
});
