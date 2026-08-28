import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { ChatWindow } from "@/components/ChatWindow";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  component: Thread,
});

function Thread() {
  const { threadId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["chat_messages", threadId],
    queryFn: async (): Promise<UIMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, parts, client_id")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: (row.client_id as string | null) ?? row.id,
        role: row.role as UIMessage["role"],
        parts: (row.parts ?? []) as UIMessage["parts"],
      }));
    },
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="panel flex h-[calc(100vh-8rem)] min-h-[420px] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ChatWindow key={threadId} threadId={threadId} initialMessages={data ?? []} />;
}
