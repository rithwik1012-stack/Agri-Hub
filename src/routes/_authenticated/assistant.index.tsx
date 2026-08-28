import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assistant/")({
  component: AssistantEmpty,
});

function AssistantEmpty() {
  return (
    <div className="panel flex h-[calc(100vh-8rem)] min-h-[420px] flex-col items-center justify-center p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
        <MessageSquare className="size-6 text-primary" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold">Pick a chat or start a new one</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Your conversations with Kisan are saved so you can come back to them any time.
      </p>
    </div>
  );
}
