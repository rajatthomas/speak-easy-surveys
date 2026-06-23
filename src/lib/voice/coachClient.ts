import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const COACH_URL = `https://${PROJECT_ID}.functions.supabase.co/coach`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamCoach(
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(COACH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`Coach failed: ${res.status} ${t}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) yield value;
  }
}