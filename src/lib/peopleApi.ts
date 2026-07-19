/** People-model client layer (stage 3B). Thin wrappers over the 15 secured
 *  RPCs from stage 3A, with an injectable client for mocked tests.
 *  No direct table access anywhere. */

export interface GuardianListItem {
  id: string; full_name: string; phone: string | null; email: string | null;
  is_active: boolean; has_account: boolean; linked_students: number;
}
export interface GuardianLink {
  link_id: string; student_id: string; student_name: string;
  relationship_type: "mother" | "father" | "guardian" | "other";
  is_primary_contact: boolean; is_legal_guardian: boolean; receives_updates: boolean;
  emergency_priority: number | null; active: boolean;
  active_from: string; active_to: string | null;
}
export interface GuardianDetails {
  guardian: { id: string; full_name: string; phone: string | null; email: string | null; is_active: boolean; has_account: boolean };
  links: GuardianLink[];
}
export interface StaffListItem {
  id: string; full_name: string; phone: string | null; email: string | null;
  is_active: boolean; has_account: boolean; roles: string[]; linked_students: number;
}
export interface StaffAssignment {
  assignment_id: string; student_id: string; student_name: string;
  role_type: "primary" | "assistant" | "other"; active: boolean;
  active_from: string; active_to: string | null;
}
export interface StaffDetails {
  staff: { id: string; full_name: string; phone: string | null; email: string | null; is_active: boolean; has_account: boolean };
  roles: string[];
  assignments: StaffAssignment[];
}

export const RELATIONSHIP_LABELS: Record<string, string> = {
  mother: "אמא", father: "אבא", guardian: "אפוטרופוס/ית", other: "קשר אחר",
};
export const COACH_ROLE_LABELS: Record<string, string> = {
  primary: "מאמן/ת ראשי/ת", assistant: "מאמן/ת עוזר/ת", other: "אחר",
};
export const STAFF_ROLE_LABELS: Record<string, string> = {
  coach: "מאמן/ת", madrich: "מדריך/ה", teacher: "מורה", support: "צוות תומך", other: "אחר",
};

export interface RpcClient {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}
const call = async <T,>(client: RpcClient, fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};

export const peopleApi = (client: RpcClient) => ({
  /* guardians */
  listGuardians: (search: string | null, activeOnly = true) =>
    call<GuardianListItem[]>(client, "list_guardians", { p_search: search, p_active_only: activeOnly }),
  guardianDetails: (guardianId: string) =>
    call<GuardianDetails>(client, "get_guardian_details", { p_guardian: guardianId }),
  createGuardian: (fullName: string, phone: string | null, email: string | null) =>
    call<string>(client, "create_guardian", { p_full_name: fullName, p_phone: phone, p_email: email }),
  updateGuardian: (guardianId: string, fullName: string, phone: string | null, email: string | null, isActive: boolean) =>
    call<void>(client, "update_guardian", { p_guardian: guardianId, p_full_name: fullName, p_phone: phone, p_email: email, p_is_active: isActive }),
  linkGuardian: (guardianId: string, studentId: string, relationshipType: string,
    isPrimary: boolean, isLegal: boolean, receivesUpdates: boolean, emergencyPriority: number | null) =>
    call<string>(client, "link_guardian_to_student", {
      p_guardian: guardianId, p_student: studentId, p_relationship_type: relationshipType,
      p_is_primary_contact: isPrimary, p_is_legal_guardian: isLegal,
      p_receives_updates: receivesUpdates, p_emergency_priority: emergencyPriority,
    }),
  updateGuardianLink: (linkId: string, relationshipType: string, isPrimary: boolean,
    isLegal: boolean, receivesUpdates: boolean, emergencyPriority: number | null) =>
    call<void>(client, "update_student_guardian_relationship", {
      p_link: linkId, p_relationship_type: relationshipType, p_is_primary_contact: isPrimary,
      p_is_legal_guardian: isLegal, p_receives_updates: receivesUpdates, p_emergency_priority: emergencyPriority,
    }),
  unlinkGuardian: (linkId: string) =>
    call<void>(client, "unlink_guardian_from_student", { p_link: linkId }),
  /* staff */
  listStaff: (search: string | null, activeOnly = true) =>
    call<StaffListItem[]>(client, "list_staff_members", { p_search: search, p_active_only: activeOnly }),
  staffDetails: (staffId: string) =>
    call<StaffDetails>(client, "get_staff_member_details", { p_staff: staffId }),
  createStaff: (fullName: string, phone: string | null, email: string | null) =>
    call<string>(client, "create_staff_member", { p_full_name: fullName, p_phone: phone, p_email: email }),
  updateStaff: (staffId: string, fullName: string, phone: string | null, email: string | null, isActive: boolean) =>
    call<void>(client, "update_staff_member", { p_staff: staffId, p_full_name: fullName, p_phone: phone, p_email: email, p_is_active: isActive }),
  setStaffRoles: (staffId: string, roles: string[]) =>
    call<void>(client, "set_staff_member_roles", { p_staff: staffId, p_roles: roles }),
  linkCoach: (staffId: string, studentId: string, roleType: string) =>
    call<string>(client, "link_coach_to_student", { p_staff: staffId, p_student: studentId, p_role_type: roleType }),
  updateCoachAssignment: (assignmentId: string, roleType: string) =>
    call<void>(client, "update_student_coach_assignment", { p_assignment: assignmentId, p_role_type: roleType }),
  unlinkCoach: (assignmentId: string) =>
    call<void>(client, "unlink_coach_from_student", { p_assignment: assignmentId }),
});
