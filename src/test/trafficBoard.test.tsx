/**
 * חדר הבקרה (רמזורים): guarded to admin; real-data-only provenance —
 * the page must never invent a derived bagrut light before the column
 * mapping is approved, and must state the stored-status provenance.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LearningTrafficBoardPage from "@/pages/LearningTrafficBoardPage";

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <LearningTrafficBoardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("חדר בקרה · רמזורים", () => {
  it("is locked for a non-admin session (RLS-backed data)", () => {
    renderPage();
    expect(screen.getByText(/זמין למנהלת המערכת בלבד/)).toBeTruthy();
    // no board UI leaks to non-admins
    expect(screen.queryByText(/מציג/)).toBeNull();
    expect(screen.queryByText(/רמזור בגרות · בהכנה/)).toBeNull();
  });
});
