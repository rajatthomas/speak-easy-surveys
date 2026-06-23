import { useCallback, useEffect, useRef, useState } from "react";
import { createVAD, type VADInstance } from "@/lib/voice/vad";
import { transcribe } from "@/lib/voice/sttClient";
import { streamCoach, type ChatMessage } from "@/lib/voice/coachClient";
import { TTSPlayer } from "@/lib/voice/ttsPlayer";
import { useToast } from "@/hooks/use-toast";

export type VoiceState =
  | "idle"
  | "loading"
  | "listening"
  | "user_speaking"
  | "transcribing"
  | "thinking"
  | "speaking";

export interface VoiceMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
}

interface Options {
  voice?: string;
  onMessageAdded?: (text: string, sender: "user" | "ai") => void;
}

export function useVoiceConversation(opts: Options = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [interimUser, setInterimUser] = useState("");
  const [interimAI, setInterimAI] = useState("");
  const [active, setActive] = useState(false);

  const vadRef = useRef<VADInstance | null>(null);
  const ttsRef = useRef<TTSPlayer>(new TTSPlayer());
  const coachAbortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const processingRef = useRef(false);

  const addMessage = useCallback((text: string, sender: "user" | "ai") => {
    const msg: VoiceMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text, sender,
    };
    setMessages((p) => [...p, msg]);
    historyRef.current.push({ role: sender === "user" ? "user" : "assistant", content: text });
    opts.onMessageAdded?.(text, sender);
  }, [opts]);

  const interrupt = useCallback(() => {
    coachAbortRef.current?.abort();
    coachAbortRef.current = null;
    ttsRef.current.stop();
    setInterimAI("");
  }, []);

  const handleSpeechEnd = useCallback(async (wav: Blob) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      setState("transcribing");
      const text = (await transcribe(wav, (p) => setInterimUser(p))).trim();
      setInterimUser("");
      if (!text) { setState("listening"); return; }
      addMessage(text, "user");

      setState("thinking");
      const abort = new AbortController();
      coachAbortRef.current = abort;
      let full = "";
      try {
        for await (const chunk of streamCoach(historyRef.current, abort.signal)) {
          full += chunk;
          setInterimAI(full);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        throw e;
      }
      coachAbortRef.current = null;
      if (!full.trim()) { setState("listening"); return; }

      addMessage(full, "ai");
      setInterimAI("");
      setState("speaking");
      try {
        await ttsRef.current.speak(full, opts.voice ?? "alloy", () => {
          setState("listening");
        });
      } catch (e) {
        console.error("TTS error:", e);
        setState("listening");
      }
    } catch (e) {
      console.error("Conversation turn failed:", e);
      toast({
        title: "Voice error",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
      setState("listening");
    } finally {
      processingRef.current = false;
    }
  }, [addMessage, opts.voice, toast]);

  const handleSpeechStart = useCallback(() => {
    // Barge-in: if AI is speaking or thinking, cancel it
    if (coachAbortRef.current || ttsRef.current.isPlaying()) {
      interrupt();
    }
    setState("user_speaking");
  }, [interrupt]);

  const start = useCallback(async () => {
    if (active) return;
    try {
      setState("loading");
      const vad = await createVAD({
        onSpeechStart: handleSpeechStart,
        onSpeechEnd: handleSpeechEnd,
      });
      vadRef.current = vad;
      vad.start();
      setActive(true);
      setState("listening");
    } catch (e) {
      console.error("VAD start failed:", e);
      toast({
        title: "Microphone error",
        description: e instanceof Error ? e.message : "Could not access microphone",
        variant: "destructive",
      });
      setState("idle");
    }
  }, [active, handleSpeechStart, handleSpeechEnd, toast]);

  const stop = useCallback(() => {
    interrupt();
    vadRef.current?.pause();
    vadRef.current?.destroy();
    vadRef.current = null;
    setActive(false);
    setState("idle");
  }, [interrupt]);

  useEffect(() => () => {
    vadRef.current?.destroy();
    ttsRef.current.stop();
  }, []);

  return { state, messages, interimUser, interimAI, active, start, stop, interrupt };
}