import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, ClipboardCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/portal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unity Portal | Churchil Ogolla" },
      { name: "description", content: "Course registration, results and approvals for students, lecturers and administrators in one calm portal." },
      { property: "og:title", content: "Unity Portal | Churchil Ogolla" },
      { property: "og:description", content: "Course registration, results and approvals in one calm portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: GraduationCap, title: "Students", text: "Register courses, follow results and print statements." },
  { icon: BookOpenCheck, title: "Lecturers", text: "Enter CA and exam scores, save drafts, submit for review." },
  { icon: ClipboardCheck, title: "Departments", text: "Review submissions, approve or return with feedback." },
  { icon: ShieldCheck, title: "Registry", text: "Faculties, sessions, accounts and a full audit trail." },
];

function Home() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Brand />
        <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <p className="fade-up text-sm font-medium text-primary">Academic records, without the paperwork</p>
        <h1 className="fade-up mt-4 text-5xl font-semibold leading-[1.05] sm:text-7xl">
          Your university,<br />beautifully in order.
        </h1>
        <p className="fade-up mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          One portal for registration, grading and approvals. Everyone sees exactly what they should, and nothing more.
        </p>
        <div className="fade-up mt-10 flex justify-center gap-3">
          <Button asChild size="lg" variant="hero">
            <Link to="/auth">Open the portal <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="fade-up glass rounded-3xl border border-border p-6 shadow-soft">
            <f.icon className="size-5 text-primary" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
      <footer className="px-6 pb-8 text-center text-sm text-muted-foreground">Built by Churchil Ogolla, Senior Software Engineer</footer>
    </div>
  );
}
