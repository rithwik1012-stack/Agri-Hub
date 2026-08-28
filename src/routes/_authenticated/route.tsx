import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid,
  LineChart,
  Gavel,
  Sparkles,
  LogOut,
  Leaf,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/market", label: "Market prices", icon: LineChart },
  { to: "/sell", label: "Sell & auction", icon: Gavel },
  { to: "/buy", label: "Buy harvest", icon: Store },
  { to: "/assistant", label: "AI assistant", icon: Sparkles },
] as const;

function Shell() {
  const { user } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, location")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background p-3 md:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-4">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-3xl border border-border bg-sidebar p-4 shadow-soft lg:flex">
          <div className="flex items-center gap-2 px-2 py-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">AgriBid</span>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-primary-soft text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-2xl bg-secondary p-4">
            <p className="text-sm font-semibold">{profile?.full_name || "Farmer"}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile?.role ?? "farmer"}
              {profile?.location ? ` · ${profile.location}` : ""}
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-card/95 p-2 backdrop-blur lg:hidden">
        {nav.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
