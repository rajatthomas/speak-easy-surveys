import { logger } from "@/lib/logger";

/**
 * Push-to-talk recorder. Captures mic audio via MediaRecorder and returns
 * a Blob on stop, ready to ship to the STT edge function.
 */
export class PushToTalkRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mime = "";

  isRecording(): boolean {
    return this.recorder?.state === "recording";
  }

  async start(): Promise<void> {
    if (this.recorder?.state === "recording") return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (e) {
      const err = e as Error;
      if (err?.name === "NotAllowedError") {
        throw new Error("Microphone permission denied. Please allow mic access and try again.");
      }
      if (err?.name === "NotFoundError") {
        throw new Error("No microphone found. Connect a microphone and try again.");
      }
      throw err;
    }

    this.mime = pickMime();
    this.chunks = [];
    this.recorder = new MediaRecorder(
      this.stream,
      this.mime ? { mimeType: this.mime } : undefined,
    );
    this.recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
    };
    this.recorder.start(250);
    logger.log("[recorder] start mime=", this.mime || "(default)");
  }

  async stop(): Promise<{ blob: Blob; filename: string } | null> {
    const rec = this.recorder;
    const stream = this.stream;
    if (!rec) {
      this.cleanup();
      return null;
    }
    const done = new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
    });
    try { rec.stop(); } catch { /* noop */ }
    await done;
    stream?.getTracks().forEach((t) => t.stop());
    const type = this.mime || rec.mimeType || "audio/webm";
    const blob = new Blob(this.chunks, { type });
    const filename = type.includes("mp4") ? "speech.mp4"
      : type.includes("ogg") ? "speech.ogg"
      : "speech.webm";
    logger.log("[recorder] stop bytes=", blob.size);
    this.cleanup();
    if (blob.size === 0) return null;
    return { blob, filename };
  }

  cancel(): void {
    try { this.recorder?.stop(); } catch { /* noop */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.cleanup();
  }

  private cleanup() {
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
  }
}

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) {
      return m;
    }
  }
  return "";
}