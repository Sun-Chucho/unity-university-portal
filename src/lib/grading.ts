// The default university grading scale (5 point system).
// The database holds the live copy in grading_scale; this mirror is used for previews
// while a lecturer types scores, before anything is saved.
export const DEFAULT_SCALE = [
  { grade: "A", min: 70, points: 5 },
  { grade: "B", min: 60, points: 4 },
  { grade: "C", min: 50, points: 3 },
  { grade: "D", min: 45, points: 2 },
  { grade: "E", min: 40, points: 1 },
  { grade: "F", min: 0, points: 0 },
] as const;

export const CA_MAX = 40;
export const EXAM_MAX = 60;

export function gradeFor(total: number) {
  const row = DEFAULT_SCALE.find((g) => total >= g.min) ?? DEFAULT_SCALE[DEFAULT_SCALE.length - 1];
  return { grade: row.grade, points: row.points };
}

// GPA is the credit weighted mean: sum(units x points) / sum(units).
export function computeGPA(rows: Array<{ units: number; points: number | null }>) {
  let units = 0;
  let weighted = 0;
  for (const r of rows) {
    if (r.points == null) continue;
    units += r.units;
    weighted += r.units * r.points;
  }
  return units === 0 ? 0 : Math.round((weighted / units) * 100) / 100;
}

export function classOfDegree(cgpa: number) {
  if (cgpa >= 4.5) return "First Class";
  if (cgpa >= 3.5) return "Second Class Upper";
  if (cgpa >= 2.4) return "Second Class Lower";
  if (cgpa >= 1.5) return "Third Class";
  if (cgpa >= 1.0) return "Pass";
  return "Probation";
}
