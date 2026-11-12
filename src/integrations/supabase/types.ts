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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academic_sessions: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          department_id: string | null
          details: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          department_id?: string | null
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          department_id?: string | null
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      course_allocations: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lecturer_id: string
          semester_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lecturer_id: string
          semester_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lecturer_id?: string
          semester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_allocations_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_allocations_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          department_id: string
          id: string
          level: number
          program_id: string | null
          term: Database["public"]["Enums"]["semester_term"]
          title: string
          units: number
        }
        Insert: {
          code: string
          created_at?: string
          department_id: string
          id?: string
          level: number
          program_id?: string | null
          term: Database["public"]["Enums"]["semester_term"]
          title: string
          units: number
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string
          id?: string
          level?: number
          program_id?: string | null
          term?: Database["public"]["Enums"]["semester_term"]
          title?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          faculty_id: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          faculty_id: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          faculty_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      grading_scale: {
        Row: {
          grade: string
          max_score: number
          min_score: number
          points: number
        }
        Insert: {
          grade: string
          max_score: number
          min_score: number
          points: number
        }
        Update: {
          grade?: string
          max_score?: number
          min_score?: number
          points?: number
        }
        Relationships: []
      }
      lecturers: {
        Row: {
          id: string
          staff_no: string
          title: string | null
        }
        Insert: {
          id: string
          staff_no: string
          title?: string | null
        }
        Update: {
          id?: string
          staff_no?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecturers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
        }
        Insert: {
          address?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
        }
        Update: {
          address?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          code: string
          created_at: string
          department_id: string
          duration_years: number
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id: string
          duration_years?: number
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string
          duration_years?: number
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          course_id: string
          created_at: string
          id: string
          semester_id: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          semester_id: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          semester_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      result_submissions: {
        Row: {
          course_id: string
          feedback: string | null
          id: string
          lecturer_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          semester_id: string
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          feedback?: string | null
          id?: string
          lecturer_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          semester_id: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          feedback?: string | null
          id?: string
          lecturer_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          semester_id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_submissions_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_submissions_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          ca_score: number
          exam_score: number
          grade: string | null
          id: string
          points: number | null
          registration_id: string
          submission_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          ca_score?: number
          exam_score?: number
          grade?: string | null
          id?: string
          points?: number | null
          registration_id: string
          submission_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          ca_score?: number
          exam_score?: number
          grade?: string | null
          id?: string
          points?: number | null
          registration_id?: string
          submission_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "result_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          id: string
          is_current: boolean
          registration_open: boolean
          session_id: string
          term: Database["public"]["Enums"]["semester_term"]
        }
        Insert: {
          id?: string
          is_current?: boolean
          registration_open?: boolean
          session_id: string
          term: Database["public"]["Enums"]["semester_term"]
        }
        Update: {
          id?: string
          is_current?: boolean
          registration_open?: boolean
          session_id?: string
          term?: Database["public"]["Enums"]["semester_term"]
        }
        Relationships: [
          {
            foreignKeyName: "semesters_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          entry_session: string | null
          id: string
          level: number
          matric_no: string
          program_id: string
        }
        Insert: {
          entry_session?: string | null
          id: string
          level?: number
          matric_no: string
          program_id: string
        }
        Update: {
          entry_session?: string | null
          id?: string
          level?: number
          matric_no?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_result: {
        Args: { _registration: string; _submission: string }
        Returns: boolean
      }
      current_semester_id: { Args: never; Returns: string }
      dept_of: { Args: { _user: string }; Returns: string }
      grade_for: { Args: { _total: number }; Returns: Record<string, unknown> }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_dept_admin_of: { Args: { _dept: string }; Returns: boolean }
      is_lecturer: { Args: { _user: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      lecturer_teaches_course: { Args: { _course: string }; Returns: boolean }
      lecturer_teaches_student: { Args: { _student: string }; Returns: boolean }
      log_action: {
        Args: {
          _action: string
          _dept: string
          _details?: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
      my_department: { Args: never; Returns: string }
      register_courses: { Args: { _course_ids: string[] }; Returns: number }
      review_results: {
        Args: { _action: string; _feedback?: string; _submission_id: string }
        Returns: Database["public"]["Enums"]["submission_status"]
      }
      save_scores: {
        Args: { _course_id: string; _scores: Json; _submit?: boolean }
        Returns: Database["public"]["Enums"]["submission_status"]
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "deactivated"
      app_role: "student" | "lecturer" | "dept_admin" | "super_admin"
      semester_term: "first" | "second"
      submission_status: "draft" | "submitted" | "approved" | "returned"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "deactivated"],
      app_role: ["student", "lecturer", "dept_admin", "super_admin"],
      semester_term: ["first", "second"],
      submission_status: ["draft", "submitted", "approved", "returned"],
    },
  },
} as const
