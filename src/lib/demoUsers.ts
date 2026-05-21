/**
 * Demo-only mock users + role→route map for the temporary
 * one-tap demo entry screen. Replace with real auth later —
 * keep this file as the single source of truth for demo identities.
 */
import type { AppUser, UserRole } from "@/context/AuthContext";

export const DEMO_COORDINATOR: AppUser = {
  name: "Orel Segal",
  role: "coordinator",
  email: "coordinator@wingate.demo",
};

export const DEMO_STAFF: AppUser = {
  name: "Dr. Ron Aviv",
  role: "staff",
  staff_type: "tutor",
  email: "staff1@wingate.demo",
};

export const DEMO_STUDENT: AppUser = {
  name: "Noam Cohen",
  role: "student",
  email: "student1@wingate.demo",
};

export const DEMO_USERS: AppUser[] = [DEMO_COORDINATOR, DEMO_STAFF, DEMO_STUDENT];

/** Where each demo role should land after entry. */
export const demoRoleHome: Partial<Record<UserRole, string>> = {
  coordinator: "/coordinator/dashboard",
  staff: "/staff/dashboard",
  student: "/student/dashboard",
};

export const isDemoRole = (role?: UserRole | null): role is "coordinator" | "staff" | "student" =>
  role === "coordinator" || role === "staff" || role === "student";
