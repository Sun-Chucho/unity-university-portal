import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Shared reads. Every one of these is filtered by row level security on the server,
// so the same query safely returns different rows for different roles.

export const currentSemesterQuery = queryOptions({
  queryKey: ["semester", "current"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("semesters")
      .select("id, term, registration_open, academic_sessions(name)")
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const studentQuery = (id: string) =>
  queryOptions({
    queryKey: ["student", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, programs(id, name, code, department_id, departments(name, code, faculties(name)))")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const myRegistrationsQuery = (id: string) =>
  queryOptions({
    queryKey: ["registrations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, semester_id, created_at, courses(id, code, title, units, level)")
        .eq("student_id", id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const myResultsQuery = (id: string) =>
  queryOptions({
    queryKey: ["results", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("id, ca_score, exam_score, total, grade, points, registrations!inner(student_id, semester_id, courses(code, title, units), semesters(term, academic_sessions(name)))")
        .eq("registrations.student_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

export const departmentsQuery = queryOptions({
  queryKey: ["departments"],
  queryFn: async () => {
    const { data, error } = await supabase.from("departments").select("*, faculties(name)").order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const programsQuery = queryOptions({
  queryKey: ["programs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("programs").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const termLabel = (t?: string | null) => (t === "second" ? "Second semester" : "First semester");
