import { createFileRoute, Outlet, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { threadsQuery } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI farming assistant · AgriBid" },
      {
        name: "description",
        content:
          "Chat with Kisan, the AgriBid AI assistant, about crop pricing, selling timing and buyer bids. Conversations are saved.",
      },
      { property: "og:title", content: "AI farming assistant" },
      {
        property: "og:description",
        content: "Ask about crop pricing, selling timing and buyer bids.",
      },
    ],
  }),
  component: AssistantLayout,
});

function AssistantLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: threads = [] } = useQuery(threadsQuery);
  const params = useParams({ strict: false }) as { threadId?: string };

  const newThread = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .insert({ user_id: user.id, title: "New chat" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["chat_threads"] });
      navigate({ to: "/assistant/$threadId", params: { threadId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeThread = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_threads").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["chat_threads"] });
      if (params.threadId === id) navigate({ to: "/assistant" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI assistant"
        subtitle="Kisan answers pricing and farming questions. Every chat is saved to your account."
        action={
          <button
            onClick={() => newThread.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> New chat
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="panel h-fit max-h-[70vh] overflow-y-auto p-3">
          <p className="px-2 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Saved chats
          </p>
          {threads.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No chats yet.</p>
          ) : null}
          <div className="space-y-1">
            {threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-1 rounded-xl px-2 transition-colors",
                  params.threadId === t.id ? "bg-primary-soft" : "hover:bg-muted",
                )}
              >
                <Link
                  to="/assistant/$threadId"
                  params={{ threadId: t.id }}
                  className="min-w-0 flex-1 truncate py-2.5 text-sm font-medium"
                >
                  {t.title}
                </Link>
                <button
                  onClick={() => removeThread.mutate(t.id)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label="Delete chat"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <Outlet />
      </div>
    </div>
  );
}
