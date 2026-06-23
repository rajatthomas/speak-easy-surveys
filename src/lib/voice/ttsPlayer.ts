import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const TTS_URL = `https://${PROJECT_ID}.functions.supabase.co/tts`;

export class TTSPlayer {
  private ctx: AudioContext | null = null;
  private playhead = 0;
  private pending = new Uint8Array(0);
  private sources: AudioBufferSourceNode[] = [];
  private abort: AbortController | null = null;

  isPlaying(): boolean {
    return this.abort !== null;
  }

  stop() {
    this.abort?.abort();
    this.abort = null;
    for (const s of this.sources) {
      try { s.stop(); } catch { /* noop */ }
    }
    this.sources = [];
    this.playhead = 0;
    this.pending = new Uint8Array(0);
  }

  async speak(text: string, voice = "alloy", onDone?: () => void): Promise<void> {
    this.stop();
    const abort = new AbortController();
    this.abort = abort;

    if (!this.ctx) this.ctx = new AudioContext({ sampleRate: 24000 });
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {});

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, voice }),
      signal: abort.signal,
    });

    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      throw new Error(`TTS failed: ${res.status} ${t}`);
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    try {
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
            if (ev.type === "speech.audio.delta" && ev.audio) {
              this.playChunk(this.base64ToBytes(ev.audio));
            }
          } catch { /* ignore */ }
        }
      }
      await this.waitForPlayback(abort);
      if (!abort.signal.aborted && this.abort === abort) onDone?.();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      throw e;
    } finally {
      if (this.abort === abort) {
        this.abort = null;
        this.playhead = 0;
        this.pending = new Uint8Array(0);
      }
    }
  }

  private async waitForPlayback(abort: AbortController): Promise<void> {
    if (!this.ctx) return;
    const delayMs = Math.max(0, (this.playhead - this.ctx.currentTime) * 1000);
    if (delayMs <= 0) return;

    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, delayMs);
      abort.signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
  }

  private base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  private playChunk(incoming: Uint8Array) {
    if (!this.ctx) return;
    const bytes = new Uint8Array(this.pending.length + incoming.length);
    bytes.set(this.pending);
    bytes.set(incoming, this.pending.length);
    const usable = bytes.length - (bytes.length % 2);
    this.pending = bytes.slice(usable);
    if (usable === 0) return;
    const samples = new Int16Array(bytes.buffer, 0, usable / 2);
    const floats = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768;
    const buffer = this.ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);
    if (this.playhead === 0) this.playhead = this.ctx.currentTime + 0.05;
    else this.playhead = Math.max(this.playhead, this.ctx.currentTime);
    src.start(this.playhead);
    this.playhead += buffer.duration;
    this.sources.push(src);
    src.onended = () => {
      this.sources = this.sources.filter((s) => s !== src);
    };
  }
}