import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Empty, PageHeader, Panel, Stat, td } from "@/components/portal";
import { computeGPA, classOfDegree } from "@/lib/grading";
import { currentSemesterQuery, myRegistrationsQuery, myResultsQuery, studentQuery, termLabel } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/student/")({
  component: StudentHome,
});

function StudentHome() {
  const { me } = Route.useRouteContext();
  const { data: student } = useQuery(studentQuery(me.id));
  const { data: sem } = useQuery(currentSemesterQuery);
  const { data: regs = [] } = useQuery(myRegistrationsQuery(me.id));
  const { data: results = [] } = useQuery(myResultsQuery(me.id));

  const current = regs.filter((r) => r.semester_id === sem?.id);
  const units = current.reduce((n, r) => n + (r.courses?.units ?? 0), 0);
  const cgpa = computeGPA(results.map((r) => ({ units: r.registrations?.courses?.units ?? 0, points: r.points })));
  const first = me.profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader
        eyebrow={`${sem?.academic_sessions?.name ?? ""} · ${termLabel(sem?.term)}`}
        title={`Hello, ${first}`}
        description="Here is where you stand this semester."
        actions={<Button asChild variant="hero"><Link to="/student/register">Register courses</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Cumulative GPA" value={cgpa.toFixed(2)} hint={results.length ? classOfDegree(cgpa) : "No approved results yet"} icon={Award} />
        <Stat label="Courses this semester" value={current.length} icon={BookOpen} />
        <Stat label="Units registered" value={units} hint="Maximum 24 per semester" icon={Layers} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Academic identity">
          <dl className="space-y-3 text-sm">
            {[
              ["Matric number", student?.matric_no],
              ["Faculty", student?.programs?.departments?.faculties?.name],
              ["Department", student?.programs?.departments?.name],
              ["Program", student?.programs?.name],
              ["Level", student?.level ? `${student.level} Level` : undefined],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border pb-3 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v ?? "-"}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Registered this semester">
          {current.length === 0 ? (
            <Empty>You have not registered any courses yet.</Empty>
          ) : (
            <DataTable head={["Code", "Title", "Units"]}>
              {current.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} font-medium`}>{r.courses?.code}</td>
                  <td className={td}>{r.courses?.title}</td>
                  <td className={td}>{r.courses?.units}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>
      </div>
    </>
  );
}
