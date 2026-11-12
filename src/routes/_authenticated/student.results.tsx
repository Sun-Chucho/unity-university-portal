import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Empty, PageHeader, Panel, Stat, td } from "@/components/portal";
import { classOfDegree, computeGPA, DEFAULT_SCALE } from "@/lib/grading";
import { myResultsQuery, studentQuery, termLabel } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/student/results")({
  component: Results,
});

function Results() {
  const { me } = Route.useRouteContext();
  const { data: student } = useQuery(studentQuery(me.id));
  // The database only returns rows the department has approved.
  const { data: results = [] } = useQuery(myResultsQuery(me.id));

  const groups = new Map<string, { label: string; rows: typeof results }>();
  for (const r of results) {
    const s = r.registrations?.semesters;
    const key = `${s?.academic_sessions?.name}-${s?.term}`;
    if (!groups.has(key)) groups.set(key, { label: `${s?.academic_sessions?.name} · ${termLabel(s?.term)}`, rows: [] });
    groups.get(key)!.rows.push(r);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const toGpa = (rows: typeof results) => computeGPA(rows.map((r) => ({ units: r.registrations?.courses?.units ?? 0, points: r.points })));
  const cgpa = toGpa(results);
  const units = results.reduce((n, r) => n + (r.registrations?.courses?.units ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Statement of result"
        title="Academic results"
        description={`${me.profile?.full_name} · ${student?.matric_no ?? ""} · ${student?.programs?.name ?? ""}`}
        actions={<Button variant="outline" onClick={() => window.print()}><Printer /> Print statement</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="CGPA" value={cgpa.toFixed(2)} hint="On a 5.00 scale" />
        <Stat label="Standing" value={<span className="text-2xl">{results.length ? classOfDegree(cgpa) : "-"}</span>} />
        <Stat label="Units earned" value={units} />
      </div>

      <div className="mt-6 space-y-6">
        {ordered.length === 0 && <Empty>No approved results yet. They appear here as soon as your department approves them.</Empty>}
        {ordered.map(([key, g]) => (
          <Panel key={key} title={g.label} action={<span className="text-sm text-muted-foreground">GPA <span className="font-semibold text-foreground">{toGpa(g.rows).toFixed(2)}</span></span>}>
            <DataTable head={["Code", "Title", "Units", "CA", "Exam", "Total", "Grade"]}>
              {g.rows.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} font-medium`}>{r.registrations?.courses?.code}</td>
                  <td className={td}>{r.registrations?.courses?.title}</td>
                  <td className={td}>{r.registrations?.courses?.units}</td>
                  <td className={td}>{r.ca_score}</td>
                  <td className={td}>{r.exam_score}</td>
                  <td className={`${td} font-medium`}>{r.total}</td>
                  <td className={`${td} font-semibold`}>{r.grade}</td>
                </tr>
              ))}
            </DataTable>
          </Panel>
        ))}
        <p className="text-xs text-muted-foreground">
          Grading scale: {DEFAULT_SCALE.map((g) => `${g.grade} ${g.min}+ (${g.points})`).join(", ")}. GPA is weighted by course units.
        </p>
      </div>
    </>
  );
}
