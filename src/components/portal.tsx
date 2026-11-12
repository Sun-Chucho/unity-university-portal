import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type Me } from "@/lib/session";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src={logo} alt="" width={32} height={32} className="size-8" />
      {!compact && <span className="font-display text-[17px] font-semibold tracking-tight">Unity Portal</span>}
    </span>
  );
}

// One shell for every role so the portal feels like a single product.
export function AppShell({ me, nav, children }: { me: Me; nav: NavItem[]; children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (item: NavItem) => (item.exact ? path === item.to : path.startsWith(item.to));
  const initials = (me.profile?.full_name || me.email).split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="min-h-screen bg-background">
      <aside className="no-print glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border lg:flex">
        <div className="px-6 py-6">
          <Link to="/dashboard"><Brand /></Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                isActive(item) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <item.icon className={cn("size-4 text-muted-foreground", isActive(item) && "text-primary")} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="m-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-primary-foreground">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{me.profile?.full_name || me.email}</p>
            <p className="truncate text-xs text-muted-foreground">{me.primary ? ROLE_LABEL[me.primary] : ""}</p>
          </div>
          <button onClick={signOut} aria-label="Sign out" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <header className="no-print glass sticky top-0 z-30 border-b border-border lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <button onClick={signOut} aria-label="Sign out" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><LogOut className="size-4" /></button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs", isActive(item) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">{children}</div>
        <p className="px-4 pb-6 text-center text-xs text-muted-foreground">Built by Churchil Ogolla</p>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="fade-up mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-primary">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("fade-up rounded-3xl border border-border bg-card p-6 shadow-soft", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="fade-up rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-primary" />}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-warning/20 text-warning-foreground",
  approved: "bg-success/15 text-success",
  returned: "bg-destructive/10 text-destructive",
  active: "bg-success/15 text-success",
  suspended: "bg-warning/20 text-warning-foreground",
  deactivated: "bg-destructive/10 text-destructive",
  none: "bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_STYLE[status] ?? STATUS_STYLE.none)}>
      {status === "none" ? "Not started" : status}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

// Plain table styled once so every list reads the same.
export function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            {head.map((h) => <th key={h} className="px-2 pb-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-2 py-3 align-middle";
