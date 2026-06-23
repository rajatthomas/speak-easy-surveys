import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from '@/lib/logger';
import { PushToTalkRecorder } from "@/lib/voice/recorder";
import { transcribe } from "@/lib/voice/sttClient";
import { streamCoach, type ChatMessage } from "@/lib/voice/coachClient";
import { TTSPlayer } from "@/lib/voice/ttsPlayer";
import { useToast } from "@/hooks/use-toast";

export type VoiceState =
  | "idle"
  | "loading"
  | "ready"
  | "recording"
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

  const recorderRef = useRef<PushToTalkRecorder>(new PushToTalkRecorder());
  const ttsRef = useRef<TTSPlayer>(new TTSPlayer());
  const coachAbortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const processingRef = useRef(false);
  const emptySttCountRef = useRef(0);
  const activeRef = useRef(false);

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

  const goReady = useCallback(() => {
    if (activeRef.current) setState("ready");
  }, []);

  const speakAndResume = useCallback(async (text: string) => {
    if (!activeRef.current) return;
    setState("speaking");
    try {
      logger.log("[voice] TTS speak start");
      await ttsRef.current.speak(text, opts.voice ?? "alloy");
      logger.log("[voice] TTS playback done");
    } catch (e) {
      if ((e as Error).name !== "AbortError") logger.error("TTS error:", e);
    } finally {
      goReady();
    }
  }, [opts.voice, goReady]);

  const processRecording = useCallback(async (audio: Blob, filename: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      setState("transcribing");
      logger.log("[voice] STT request, bytes=", audio.size);
      const text = (await transcribe(audio, (p) => setInterimUser(p), undefined, filename)).trim();
      setInterimUser("");
      logger.log("[voice] STT final=", JSON.stringify(text));
      if (!text) {
        emptySttCountRef.current += 1;
        const recovery = emptySttCountRef.current >= 2
          ? "I'm hearing sound, but I can't make out the words clearly. Could you try again a little closer to the mic?"
          : "Sorry, I couldn't make that out. Could you say that again?";
        if (emptySttCountRef.current >= 2) {
          toast({
            title: "I didn't catch that",
            description: "Try speaking a bit louder or closer to the mic.",
          });
          emptySttCountRef.current = 0;
        }
        await speakAndResume(recovery);
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
      if (!full.trim()) { goReady(); return; }

      addMessage(full, "ai");
      setInterimAI("");
      await speakAndResume(full);
    } catch (e) {
      logger.error("Conversation turn failed:", e);
      toast({
        title: "Voice error",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
      goReady();
    } finally {
      processingRef.current = false;
    }
  }, [addMessage, goReady, speakAndResume, toast]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    try {
      setState("loading");
      activeRef.current = true;
      setActive(true);

      if (opts.greeting && historyRef.current.length === 0) {
        addMessage(opts.greeting, "ai");
        await speakAndResume(opts.greeting);
      } else {
        goReady();
      }
    } catch (e) {
      logger.error("Voice start failed:", e);
      toast({
        title: "Voice error",
        description: e instanceof Error ? e.message : "Could not access microphone",
        variant: "destructive",
      });
      activeRef.current = false;
      setActive(false);
      setState("idle");
    }
  }, [toast, opts.greeting, addMessage, speakAndResume, goReady]);

  const toggleTalk = useCallback(async () => {
    if (!activeRef.current) return;
    // While AI is speaking/thinking, treat tap as barge-in then start recording.
    if (state === "speaking" || state === "thinking") {
      interrupt();
    }
    if (recorderRef.current.isRecording()) {
      // Stop & process
      try {
        const result = await recorderRef.current.stop();
        if (!result) {
          goReady();
          return;
        }
        await processRecording(result.blob, result.filename);
      } catch (e) {
        logger.error("[voice] stop failed:", e);
        goReady();
      }
    } else if (state === "ready" || state === "speaking" || state === "thinking") {
      try {
        await recorderRef.current.start();
        setState("recording");
      } catch (e) {
        toast({
          title: "Microphone error",
          description: e instanceof Error ? e.message : "Could not access microphone",
          variant: "destructive",
        });
        goReady();
      }
    }
  }, [state, interrupt, processRecording, goReady, toast]);

  const stop = useCallback(() => {
    activeRef.current = false;
    interrupt();
    recorderRef.current.cancel();
    setActive(false);
    setState("idle");
  }, [interrupt]);

  useEffect(() => () => {
    activeRef.current = false;
    recorderRef.current.cancel();
    ttsRef.current.stop();
  }, []);

  return { state, messages, interimUser, interimAI, active, start, stop, toggleTalk, interrupt };
}