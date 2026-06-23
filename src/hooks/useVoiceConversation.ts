import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from '@/lib/logger';
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
  greeting?: string;
  onMessageAdded?: (text: string, sender: "user" | "ai") => void;
}

export function useVoiceConversation(opts: Options = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [interimUser, setInterimUser] = useState("");
  const [interimAI, setInterimAI] = useState("");
  const [active, setActive] = useState(false);
  const [vadSpeaking, setVadSpeaking] = useState(false);

  const vadRef = useRef<VADInstance | null>(null);
  const ttsRef = useRef<TTSPlayer>(new TTSPlayer());
  const coachAbortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const processingRef = useRef(false);
  const emptySttCountRef = useRef(0);

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
    setVadSpeaking(false);
    try {
      setState("transcribing");
      logger.log("[voice] STT request, bytes=", wav.size);
      const text = (await transcribe(wav, (p) => setInterimUser(p))).trim();
      setInterimUser("");
      logger.log("[voice] STT final=", JSON.stringify(text));
      if (!text) {
        emptySttCountRef.current += 1;
        if (emptySttCountRef.current >= 2) {
          toast({
            title: "I didn't catch that",
            description: "Try speaking a bit louder or closer to the mic.",
          });
          emptySttCountRef.current = 0;
        }
        setState("listening");
        return;
      }
      emptySttCountRef.current = 0;
      addMessage(text, "user");

      setState("thinking");
      const abort = new AbortController();
      coachAbortRef.current = abort;
      let full = "";
      try {
        logger.log("[voice] coach stream open");
        for await (const chunk of streamCoach(historyRef.current, abort.signal)) {
          full += chunk;
          setInterimAI(full);
        }
        logger.log("[voice] coach stream done, chars=", full.length);
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
        logger.log("[voice] TTS speak start");
        await ttsRef.current.speak(full, opts.voice ?? "alloy", () => {
          logger.log("[voice] TTS playback done");
          setState("listening");
        });
      } catch (e) {
        logger.error("TTS error:", e);
        setState("listening");
      }
    } catch (e) {
      logger.error("Conversation turn failed:", e);
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
    setVadSpeaking(true);
    setState("user_speaking");
  }, [interrupt]);

  const start = useCallback(async () => {
    if (active) return;
    try {
      setState("loading");
      const vad = await createVAD({
        onSpeechStart: handleSpeechStart,
        onSpeechEnd: handleSpeechEnd,
        onVADMisfire: () => setVadSpeaking(false),
      });
      vadRef.current = vad;
      vad.start();
      setActive(true);

      // Optional opening greeting so the user hears the AI first.
      if (opts.greeting && historyRef.current.length === 0) {
        addMessage(opts.greeting, "ai");
        setState("speaking");
        try {
          await ttsRef.current.speak(opts.greeting, opts.voice ?? "alloy", () => {
            setState("listening");
          });
        } catch (e) {
          logger.error("Greeting TTS failed:", e);
          setState("listening");
        }
      } else {
        setState("listening");
      }
    } catch (e) {
      logger.error("VAD start failed:", e);
      toast({
        title: "Microphone error",
        description: e instanceof Error ? e.message : "Could not access microphone",
        variant: "destructive",
      });
      setState("idle");
    }
  }, [active, handleSpeechStart, handleSpeechEnd, toast, opts.greeting, opts.voice, addMessage]);

  const stop = useCallback(() => {
    interrupt();
    vadRef.current?.pause();
    vadRef.current?.destroy();
    vadRef.current = null;
    setActive(false);
    setVadSpeaking(false);
    setState("idle");
  }, [interrupt]);

  useEffect(() => () => {
    vadRef.current?.destroy();
    ttsRef.current.stop();
  }, []);

  return { state, messages, interimUser, interimAI, active, vadSpeaking, start, stop, interrupt };
}