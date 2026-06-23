import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const STT_URL = `https://${PROJECT_ID}.functions.supabase.co/stt`;

export async function transcribe(
  audio: Blob,
  onDelta?: (partial: string) => void,
  signal?: AbortSignal,
  filename = "speech.webm",
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const form = new FormData();
  form.append("file", audio, filename);

  const res = await fetch(STT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
    signal,
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`STT failed: ${res.status} ${t}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let finalText = "";
  let acc = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "transcript.text.delta" && ev.delta) {
          acc += ev.delta;
          onDelta?.(acc);
        } else if (ev.type === "transcript.text.done" && ev.text) {
          finalText = ev.text;
        }
      } catch { /* ignore */ }
    }
  }
  return finalText || acc;
}