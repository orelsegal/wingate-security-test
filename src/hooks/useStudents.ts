import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type Student = Tables<"students"> & {
  first_name?: string | null;
  last_name?: string | null;
  diagnosis_status?: string | null;
  bagrut_accommodations?: string | null;
  english_support?: string | null;
  book_name?: string | null;
  book_grade?: number | null;
  summative_assessment?: string | null;
  notes?: string | null;
  exams_completed?: string | null;
  archived?: boolean | null;
  last_updated_at?: string | null;
};

export type StatusType = "green" | "yellow" | "red";

export const statusConfig: Record<StatusType, {
  label: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
  activeBg: string;
}> = {
  green: { label: "במסלול", dotClass: "bg-success", bgClass: "bg-success/10", textClass: "text-success", activeBg: "bg-success/15 ring-1 ring-success/30" },
  yellow: { label: "פערים", dotClass: "bg-warning", bgClass: "bg-warning/10", textClass: "text-warning", activeBg: "bg-warning/15 ring-1 ring-warning/30" },
  red: { label: "בסיכון", dotClass: "bg-destructive", bgClass: "bg-destructive/10", textClass: "text-destructive", activeBg: "bg-destructive/15 ring-1 ring-destructive/30" },
};

export const useStudents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["students", user?.role, user?.email],
    queryFn: async () => {
      let query = supabase.from("students").select("*").order("full_name");

      if (user?.role === "parent" && user.scopeFilter?.length) {
        query = query.in("id", user.scopeFilter);
      } else if (user?.role === "coach" && user.scopeFilter?.length) {
        query = query.in("sport", user.scopeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as Student[];
    },
    enabled: !!user,
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as Student | null;
    },
    enabled: !!id,
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related progress first
      await supabase.from("student_subject_progress").delete().eq("student_id", id);
      await supabase.from("student_roadmap_progress").delete().eq("student_id", id);
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const { error } = await supabase.from("students").update({ ...data, last_updated_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student"] });
    },
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { error } = await supabase.from("students").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};

export const useSports = () => {
  return useQuery({
    queryKey: ["sports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sports")
        .select("*")
        .order("sport_name");
      if (error) throw error;
      return data;
    },
  });
};

export const useSubjects = () => {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("subject_name");
      if (error) throw error;
      return data;
    },
  });
};

export const useStudentProgress = (studentId: string) => {
  return useQuery({
    queryKey: ["student-progress", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_subject_progress")
        .select("*, subjects(subject_name)")
        .eq("student_id", studentId);
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
};

export const useStudentRoadmap = (studentId: string, mathLevel?: number) => {
  return useQuery({
    queryKey: ["student-roadmap", studentId, mathLevel],
    queryFn: async () => {
      const { data: roadmapItems, error: riError } = await supabase
        .from("subject_roadmaps")
        .select("*, subjects(subject_name)")
        .order("order_index");
      if (riError) throw riError;

      const { data: progress, error: pError } = await supabase
        .from("student_roadmap_progress")
        .select("*")
        .eq("student_id", studentId);
      if (pError) throw pError;

      const progressMap = new Map(
        (progress || []).map((p) => [p.roadmap_item_id, p])
      );

      const filtered = (roadmapItems || []).filter((item) => {
        if (item.subject_id === "a1111111-0000-0000-0000-000000000001") {
          return item.level_option === (mathLevel || 3);
        }
        return item.level_option === null;
      });

      return filtered.map((item) => ({
        ...item,
        completed: progressMap.get(item.id)?.completed || false,
        completion_date: progressMap.get(item.id)?.completion_date || null,
        progress_id: progressMap.get(item.id)?.id || null,
      }));
    },
    enabled: !!studentId,
  });
};

export const useAllStudentProgress = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-student-progress", user?.role, user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_subject_progress")
        .select("*, students(full_name, sport, class_name, overall_status), subjects(subject_name)");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
