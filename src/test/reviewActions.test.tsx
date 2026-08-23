/**
 * ReviewActions — מה בדיוק נשלח לשרת, ומתי.
 *
 * המסלול של היסטוריה כיתה ט הוא "decision": אישור הוא החלטה פדגוגית ולא
 * ציון. הבדיקות כאן שומרות על שלושה דברים שקל לאבד בשינוי עתידי: שאין
 * שדה ציון במסלול הזה, שהאישור עובר ב-approve_submission ולעולם לא
 * ב-grade_and_approve, ושאי אפשר להחליט שום דבר בלי הערה לתלמידה.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a) },
}));

import ReviewActions from "@/components/ReviewActions";

const onDone = vi.fn();
const renderDecision = () =>
  render(
    <ReviewActions submissionId="sub-1" revision={1} mode="decision" onDone={onDone} />,
  );

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
  onDone.mockReset();
  localStorage.clear();
});

describe("ReviewActions · decision mode", () => {
  it("shows no score field", () => {
    renderDecision();
    expect(screen.queryByLabelText(/ציון/)).toBeNull();
  });

  it("cannot decide anything without feedback", () => {
    renderDecision();
    expect(screen.getByRole("button", { name: /אישור/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /החזרה לתיקון/ })).toBeDisabled();
  });

  it("approves through approve_submission, never through grade_and_approve", async () => {
    renderDecision();
    fireEvent.change(screen.getByLabelText(/הערה לתלמידה/), { target: { value: "עבודה טובה, אפשר להמשיך" } });
    fireEvent.click(screen.getByRole("button", { name: /אישור/ }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const names = rpc.mock.calls.map(c => c[0]);
    expect(names).toContain("approve_submission");
    expect(names).not.toContain("grade_and_approve");

    const [, args] = rpc.mock.calls.find(c => c[0] === "approve_submission")!;
    expect(args).toMatchObject({ p_submission: "sub-1", p_feedback: "עבודה טובה, אפשר להמשיך" });
    expect(args).not.toHaveProperty("p_score");
    expect(String(args.p_idem_key).length).toBeGreaterThanOrEqual(8);
    expect(onDone).toHaveBeenCalledWith({ kind: "approved", score: null });
  });

  it("returns for revision with the teacher's own words", async () => {
    renderDecision();
    fireEvent.change(screen.getByLabelText(/הערה לתלמידה/), { target: { value: "הרחיבי את הטענה השנייה" } });
    fireEvent.click(screen.getByRole("button", { name: /החזרה לתיקון/ }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("return_for_revision");
    expect(args).toMatchObject({ p_submission: "sub-1", p_feedback: "הרחיבי את הטענה השנייה" });
    expect(onDone).toHaveBeenCalledWith({ kind: "returned" });
  });

  it("says nothing was done when the server refuses", async () => {
    rpc.mockResolvedValue({ error: { message: "not_authorised_for_submission" } });
    renderDecision();
    fireEvent.change(screen.getByLabelText(/הערה לתלמידה/), { target: { value: "אישור" } });
    fireEvent.click(screen.getByRole("button", { name: /אישור/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("ReviewActions · graded mode is untouched", () => {
  it("still grades through grade_and_approve", async () => {
    render(<ReviewActions submissionId="sub-2" revision={1} threshold={85} onDone={onDone} />);
    fireEvent.change(screen.getByLabelText(/ציון/), { target: { value: "90" } });
    fireEvent.change(screen.getByLabelText(/הערה לתלמידה/), { target: { value: "יפה" } });
    fireEvent.click(screen.getByRole("button", { name: /אישור וציון/ }));

    await waitFor(() => expect(rpc).toHaveBeenCalled());
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("grade_and_approve");
    expect(args).toMatchObject({ p_score: 90 });
  });

  it("refuses to approve below the threshold", async () => {
    render(<ReviewActions submissionId="sub-3" revision={1} threshold={85} onDone={onDone} />);
    fireEvent.change(screen.getByLabelText(/ציון/), { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText(/הערה לתלמידה/), { target: { value: "צריך עוד" } });
    expect(screen.getByRole("button", { name: /אישור וציון/ })).toBeDisabled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
