import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Body = { messages?: UIMessage[]; threadId?: string };

const SYSTEM = `You are Kisan, the AI assistant inside AgriBid — a marketplace where farmers track crop prices and auction their harvest.
Help with: reading price trends, deciding when to sell, setting a fair base price or reserve, comparing buyer bids, crop care, weather-driven risk, storage, and government schemes.
Be concise, practical and encouraging. Use simple language, rupees (₹) and per-quintal units. Use markdown lists when helpful. If you are unsure about a live number, say so and explain how to check it on the Market prices page.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const supabaseUrl = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
        const supabaseKey =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        if (!supabaseUrl || !supabaseKey) {
          return new Response("Backend not configured", { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) return new Response("Unauthorized", { status: 401 });

        const { messages, threadId } = (await request.json()) as Body;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("messages and threadId are required", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const { error } = await supabase.from("chat_messages").insert({
            thread_id: threadId,
            user_id: user.id,
            role: "user",
            parts: lastUser.parts as unknown as never,
            client_id: lastUser.id,
          });
          if (error) console.error("save user message", error.message);
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway("google/gemini-3.7-flash"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const { error } = await supabase.from("chat_messages").insert({
              thread_id: threadId,
              user_id: user.id,
              role: "assistant",
              parts: responseMessage.parts as unknown as never,
              client_id: responseMessage.id,
            });
            if (error) console.error("save assistant message", error.message);
            await supabase
              .from("chat_threads")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", threadId);
          },
        });
      },
    },
  },
});
