/** Learning-groups client layer. Pure helpers + a thin RPC wrapper with an
 *  injectable client so success/error flows are testable without the network.
 *  All writes go through the secured RPCs — never direct table access. */

export interface LgListItem {
  id: string; name: string; subject_id: string; subject_name: string;
  grade_code: string | null; academic_year_start: number; status: "active" | "archived";
  teacher_count: number; active_students: number;
}
export interface LgTeacher { user_id: string; role_in_group: "lead" | "teacher"; full_name: string | null }
export interface LgStudent { student_id: string; full_name: string; class_name: string | null; joined_at: string }
export interface LgDetails {
  group: { id: string; name: string; subject_id: string; grade_code: string | null; academic_year_start: number; status: string };
  teachers: LgTeacher[];
  active_students: LgStudent[];
  active_count: number;
}

/** 2026 → "2026–2027" (school-year label). */
export const yearLabel = (startYear: number): string => `${startYear}–${startYear + 1}`;

/** Class comparison key: whitespace-insensitive ("יא 1" ≡ "יא1"). */
export const normalizeClass = (c: string | null | undefined): string => (c || "").replace(/\s+/g, "");

export interface ClassOption { norm: string; display: string; total: number; newCount: number }

/** Build the normalized class list for the "add class" dialog.
 *  newCount excludes students who are already active members. */
export function buildClassOptions(
  students: { id: string; class_name: string | null }[],
  activeMemberIds: Set<string>,
): { options: ClassOption[]; missingClassCount: number } {
  const map = new Map<string, ClassOption>();
  let missing = 0;
  for (const s of students) {
    const norm = normalizeClass(s.class_name);
    if (!norm || norm === "—") { missing++; continue; }
    if (!map.has(norm)) map.set(norm, { norm, display: norm, total: 0, newCount: 0 });
    const o = map.get(norm)!;
    o.total++;
    if (!activeMemberIds.has(s.id)) o.newCount++;
  }
  return {
    options: Array.from(map.values()).sort((a, b) => a.display.localeCompare(b.display, "he")),
    missingClassCount: missing,
  };
}

/** Minimal client contract (subset of supabase-js). */
export interface RpcClient {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

const call = async <T,>(client: RpcClient, fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};

export const lgApi = (client: RpcClient) => ({
  list: (year: number | null, status: string | null) =>
    call<LgListItem[]>(client, "list_learning_groups", { p_year: year, p_status: status }),
  details: (groupId: string) =>
    call<LgDetails>(client, "get_learning_group_details", { p_group: groupId }),
  create: (name: string, subjectId: string, yearStart: number, gradeCode: string | null) =>
    call<string>(client, "create_learning_group", { p_name: name, p_subject_id: subjectId, p_year_start: yearStart, p_grade_code: gradeCode }),
  update: (groupId: string, name: string, yearStart: number, gradeCode: string | null) =>
    call<void>(client, "update_learning_group", { p_group: groupId, p_name: name, p_year_start: yearStart, p_grade_code: gradeCode }),
  archive: (groupId: string) =>
    call<void>(client, "archive_learning_group", { p_group: groupId }),
  duplicate: (groupId: string, newYear: number, includeStudents: boolean) =>
    call<string>(client, "duplicate_group_for_year", { p_group: groupId, p_new_year: newYear, p_include_students: includeStudents }),
  setTeachers: (groupId: string, teachers: { user_id: string; role_in_group: "lead" | "teacher" }[]) =>
    call<void>(client, "set_group_teachers", { p_group: groupId, p_teachers: teachers }),
  addStudents: (groupId: string, studentIds: string[]) =>
    call<number>(client, "add_students_to_group", { p_group: groupId, p_student_ids: studentIds }),
  addClass: (groupId: string, className: string) =>
    call<number>(client, "add_class_to_group", { p_group: groupId, p_class_name: className }),
  removeStudent: (groupId: string, studentId: string) =>
    call<void>(client, "remove_student_from_group", { p_group: groupId, p_student: studentId }),
});
