/**
 * Interaction tests for SendUpdateDialog — the safe comms Preview flow.
 * Asserts the §comms contract: allowed recipients only, preview-before-action
 * with recipient/role/student/content/channel, honest "no external send"
 * completion, no wa.me, no "שלח לכולם", no fake "נשלח" claim.
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SendUpdateDialog from "@/components/SendUpdateDialog";

const RECIPIENTS = [
  { id: "r1", name: "המורה לתנ״ך (דמה)", role: "מורה מקצועי" },
  { id: "r2", name: "המאמן האישי (דמה)", role: "מאמן" },
];

const setup = () =>
  render(
    <SendUpdateDialog
      open
      onOpenChange={() => {}}
      contextLabel="דיווח מעקב · הכיתה שלי"
      studentName="יואב (דמה)"
      recipients={RECIPIENTS}
      defaultBody="בהמשך לדיווח המעקב: שיחה אישית השבוע."
    />,
  );

describe("SendUpdateDialog — safe preview flow", () => {
  it("shows only allowed recipients and no broadcast option", () => {
    setup();
    expect(screen.getByText("המורה לתנ״ך (דמה)")).toBeTruthy();
    expect(screen.getByText("המאמן האישי (דמה)")).toBeTruthy();
    expect(screen.getByText(/מוצגים רק גורמים מורשים/)).toBeTruthy();
    expect(screen.queryByText(/שלח לכולם|לכל הנמענים/)).toBeNull();
  });

  it("marks external channels as future-only, keeps in-system available", () => {
    setup();
    const future = screen.getAllByText(/ערוץ עתידי/);
    expect(future.length).toBe(2); // מייל + וואטסאפ
    expect(screen.getByText("בתוך המערכת")).toBeTruthy();
    // the future-channel policy line: secure link only, no grades in it
    expect(screen.getByText(/קישור מאובטח בלבד/)).toBeTruthy();
  });

  it("requires a recipient before preview is possible", () => {
    setup();
    const previewBtn = screen.getByRole("button", { name: /לתצוגה מקדימה/ }) as HTMLButtonElement;
    expect(previewBtn.disabled).toBe(true);
    fireEvent.click(screen.getByText("המורה לתנ״ך (דמה)"));
    expect(previewBtn.disabled).toBe(false);
  });

  it("preview shows recipient, role, student, content and channel before any action", () => {
    setup();
    fireEvent.click(screen.getByText("המורה לתנ״ך (דמה)"));
    fireEvent.click(screen.getByRole("button", { name: /לתצוגה מקדימה/ }));
    expect(screen.getByText(/תצוגה מקדימה/)).toBeTruthy();
    expect(screen.getByText(/המורה לתנ״ך \(דמה\) · מורה מקצועי/)).toBeTruthy();
    expect(screen.getByText("יואב (דמה)")).toBeTruthy();
    expect(screen.getByText(/בהמשך לדיווח המעקב/)).toBeTruthy();
    expect(screen.getByText("בתוך המערכת")).toBeTruthy();
    // editing is still possible from the preview
    expect(screen.getByRole("button", { name: /חזרה לעריכה/ })).toBeTruthy();
  });

  it("after confirmation: explicit no-send statement, never a fake 'נשלח'", () => {
    const { container } = setup();
    fireEvent.click(screen.getByText("המורה לתנ״ך (דמה)"));
    fireEvent.click(screen.getByRole("button", { name: /לתצוגה מקדימה/ }));
    fireEvent.click(screen.getByRole("button", { name: /^אישור$/ }));
    expect(screen.getByText(/לא בוצעה שליחה חיצונית/)).toBeTruthy();
    expect(screen.getByText(/לא נשמרה רשומה בשרת/)).toBeTruthy();
    // no claim that anything was sent, and no external share links
    expect(screen.queryByText(/^נשלח/)).toBeNull();
    expect(container.querySelector('a[href*="wa.me"]')).toBeNull();
    expect(container.innerHTML.includes("wa.me")).toBe(false);
  });
});
