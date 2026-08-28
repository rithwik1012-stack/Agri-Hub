import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Should I sell my wheat this week or wait?",
  "What base price should I set for 40 quintals of soybean?",
  "How do I read the price trend graph?",
  "Tips to store onions before the price rises",
];

export function ChatWindow({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: UIMessage[];
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { threadId },
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
      },
    }),
    onError: (error) => toast.error(error.message || "The assistant could not reply"),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["chat_threads"] });
      inputRef.current?.focus();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    if (messages.length === 0) {
      await supabase
        .from("chat_threads")
        .update({ title: value.slice(0, 60) })
        .eq("id", threadId);
      qc.invalidateQueries({ queryKey: ["chat_threads"] });
    }
    sendMessage({ text: value });
    inputRef.current?.focus();
  }

  return (
    <div className="panel flex h-[calc(100vh-8rem)] min-h-[520px] flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold">Ask Kisan anything</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Pricing, timing, storage, buyers — your assistant remembers each conversation.
            </p>
            <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-2xl border border-border bg-surface p-3 text-left text-sm transition-colors hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
            .trim();
          const user = m.role === "user";
          return (
            <div key={m.id} className={cn("flex", user ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  user
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-surface text-foreground",
                )}
              >
                {user ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="space-y-2 [&_a]:underline [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_strong]:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {status === "submitted" ? (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl border border-border bg-surface px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask about prices, buyers, storage…"
          className="max-h-40 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          aria-label="Send message"
        >
          <ArrowUp className="size-5" />
        </button>
      </form>
    </div>
  );
}
