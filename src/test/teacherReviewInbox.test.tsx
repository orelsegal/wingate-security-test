/**
 * /teacher-review — the role guard.
 *
 * RLS is the security layer. This guard is UX, and it also stops the query
 * from ever being sent by a role that has no business asking. Both matter,
 * and the test below asserts the second one directly: for student, parent
 * and coach the Supabase client is never touched.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const from = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => from(...a) },
}));

let role = "teacher";
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: role ? { id: "u", name: "בדיקה", role } : null, loading: false }),
}));

import TeacherReviewInboxPage from "@/pages/TeacherReviewInboxPage";

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <TeacherReviewInboxPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  from.mockReset();
  // a query builder that never resolves: reaching it at all is the failure
  const q: Record<string, unknown> = {};
  for (const m of ["select", "in", "order", "limit"]) q[m] = () => q;
  q.then = () => new Promise(() => {});
  from.mockReturnValue(q);
});
afterEach(() => { role = "teacher"; });

describe("/teacher-review role guard", () => {
  for (const r of ["teacher", "admin", "developer"]) {
    it(`${r} sees the inbox and the query is sent`, async () => {
      role = r;
      renderPage();
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("הגשות לבדיקה");
      await vi.waitFor(() => expect(from).toHaveBeenCalledWith("submissions"));
    });
  }

  for (const r of ["student", "parent", "coach"]) {
    it(`${r} is refused and no query is sent`, async () => {
      role = r;
      renderPage();
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("אין לך הרשאה למסך הזה");
      expect(screen.queryByText("הגשות לבדיקה")).toBeNull();
      await new Promise(res => setTimeout(res, 60));
      expect(from).not.toHaveBeenCalled();
    });
  }

  it("a signed-out user is refused and no query is sent", async () => {
    role = "";
    renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("אין לך הרשאה למסך הזה");
    await new Promise(res => setTimeout(res, 60));
    expect(from).not.toHaveBeenCalled();
  });
});
