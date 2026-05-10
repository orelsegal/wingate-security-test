export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          page_path: string | null
          user_email: string
          user_name: string
          user_role: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          user_email: string
          user_name: string
          user_role: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string | null
          user_email?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          email: string
          full_name: string
          id: string
          linked_sport: string | null
          linked_student_id: string | null
          role: string
        }
        Insert: {
          email: string
          full_name: string
          id?: string
          linked_sport?: string | null
          linked_student_id?: string | null
          role: string
        }
        Update: {
          email?: string
          full_name?: string
          id?: string
          linked_sport?: string | null
          linked_student_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_linked_student_id_fkey"
            columns: ["linked_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          notes: string | null
          sport_name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          notes?: string | null
          sport_name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          notes?: string | null
          sport_name?: string
        }
        Relationships: []
      }
      student_roadmap_progress: {
        Row: {
          completed: boolean
          completion_date: string | null
          id: string
          roadmap_item_id: string
          student_id: string
        }
        Insert: {
          completed?: boolean
          completion_date?: string | null
          id?: string
          roadmap_item_id: string
          student_id: string
        }
        Update: {
          completed?: boolean
          completion_date?: string | null
          id?: string
          roadmap_item_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_roadmap_progress_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "subject_roadmaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_roadmap_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subject_progress: {
        Row: {
          absences: number
          completion_percent: number
          covered_topics: string[] | null
          grade: number | null
          id: string
          missing_items: string[] | null
          notes: string | null
          status: string
          student_id: string
          subject_id: string
        }
        Insert: {
          absences?: number
          completion_percent?: number
          covered_topics?: string[] | null
          grade?: number | null
          id?: string
          missing_items?: string[] | null
          notes?: string | null
          status?: string
          student_id: string
          subject_id: string
        }
        Update: {
          absences?: number
          completion_percent?: number
          covered_topics?: string[] | null
          grade?: number | null
          id?: string
          missing_items?: string[] | null
          notes?: string | null
          status?: string
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_progress_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          archived: boolean | null
          avg_score: number | null
          bagrut_accommodations: string | null
          book_grade: number | null
          book_name: string | null
          class_name: string
          coach_sport: string | null
          completion_percent: number
          created_at: string
          diagnosis_status: string | null
          english_support: string | null
          exams_completed: string | null
          first_name: string | null
          full_name: string
          id: string
          last_name: string | null
          last_updated_at: string | null
          math_level: number | null
          notes: string | null
          overall_status: string
          parent_user_id: string | null
          sport: string
          summative_assessment: string | null
        }
        Insert: {
          archived?: boolean | null
          avg_score?: number | null
          bagrut_accommodations?: string | null
          book_grade?: number | null
          book_name?: string | null
          class_name: string
          coach_sport?: string | null
          completion_percent?: number
          created_at?: string
          diagnosis_status?: string | null
          english_support?: string | null
          exams_completed?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          last_name?: string | null
          last_updated_at?: string | null
          math_level?: number | null
          notes?: string | null
          overall_status?: string
          parent_user_id?: string | null
          sport: string
          summative_assessment?: string | null
        }
        Update: {
          archived?: boolean | null
          avg_score?: number | null
          bagrut_accommodations?: string | null
          book_grade?: number | null
          book_name?: string | null
          class_name?: string
          coach_sport?: string | null
          completion_percent?: number
          created_at?: string
          diagnosis_status?: string | null
          english_support?: string | null
          exams_completed?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          last_name?: string | null
          last_updated_at?: string | null
          math_level?: number | null
          notes?: string | null
          overall_status?: string
          parent_user_id?: string | null
          sport?: string
          summative_assessment?: string | null
        }
        Relationships: []
      }
      subject_roadmaps: {
        Row: {
          id: string
          level_option: number | null
          order_index: number
          required_for_completion: boolean
          subject_id: string
          topic_name: string
        }
        Insert: {
          id?: string
          level_option?: number | null
          order_index?: number
          required_for_completion?: boolean
          subject_id: string
          topic_name: string
        }
        Update: {
          id?: string
          level_option?: number | null
          order_index?: number
          required_for_completion?: boolean
          subject_id?: string
          topic_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_roadmaps_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          id: string
          subject_name: string
        }
        Insert: {
          id?: string
          subject_name: string
        }
        Update: {
          id?: string
          subject_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
