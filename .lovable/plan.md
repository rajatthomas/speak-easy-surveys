## Diagnosis

I tested the TTS edge function directly — it returns 200 and a valid SSE stream, so the gateway and edge functions are healthy. The browser console shows VAD initializes and starts, but **never fires `onSpeechStart` or `onSpeechEnd`** during the session. No STT/coach/TTS calls are made because `handleSpeechEnd` is never reached. Two real problems on the client side:

1. **VAD is not detecting your speech.** The default Silero thresholds for the v5 model in `@ricky0123/vad-web` are too strict for many mic setups, and the 800 ms redemption window makes "end of turn" feel laggy. With the current 0.5/0.35 thresholds and v5 model, soft or mid-range voices often never cross the start threshold.
2. **The AI never speaks first**, so if VAD isn't picking you up there is zero feedback that anything is wrong — the avatar just sits in "Listening…" forever.

## Fix plan

### 1. Make VAD actually detect speech

In `src/lib/voice/vad.ts`:
- Switch from `model: "v5"` to the default `legacy` Silero model — it is more forgiving on browser mic input and is what the library recommends when v5 misses speech.
- Lower thresholds: `positiveSpeechThreshold: 0.35`, `negativeSpeechThreshold: 0.25`.
- Shorten `redemptionMs` to `500` so end-of-turn detection feels snappy.
- Keep `minSpeechMs: 250`, `preSpeechPadMs: 200`.
- Add an `onFrameProcessed` debug hook (dev only) that logs probability so we can confirm the mic is actually feeding the model when troubleshooting.

### 2. AI greets first so the user gets immediate feedback

In `useVoiceConversation.ts`:
- Add an optional `greeting` string option. When `start()` succeeds, if `greeting` is set and history is empty, push it to messages, set state to `speaking`, and play it via the TTS player before flipping to `listening`.
- `ConversationPage` passes a short greeting: *"Hi — I'm here whenever you're ready. How's work been going lately?"*

This both confirms audio output works and gives the user something to react to.

### 3. Visible feedback when VAD hears you

- In `useVoiceConversation`, expose a `vadSpeaking` boolean (set true on `onSpeechStart`, false on `onSpeechEnd`/`onVADMisfire`).
- `ConversationPage` shows a small "I hear you…" indicator under the avatar while `vadSpeaking` is true, in addition to the existing `user_speaking` waveform. This makes it obvious whether the mic pipeline is working.

### 4. Better error surfacing

- In `handleSpeechEnd`, if STT returns empty text twice in a row, surface a toast: *"I didn't catch that — try speaking a bit louder or closer to the mic."*
- In `vad.ts`, wrap `MicVAD.new` so that `getUserMedia` rejection is rethrown with a clear message ("Microphone permission denied" vs "No microphone found") instead of the raw DOMException.

### 5. Keep diagnostics during development

- Add `logger.debug` calls (dev-only via existing `logger`) at: VAD speech start, VAD speech end (with blob size), STT request start, STT final text, coach stream open, coach stream done, TTS speak start, TTS playback done. These only fire in dev so they do not violate the `verbose_console_logging` rule.

## Files touched

- `src/lib/voice/vad.ts` — model + thresholds + clearer mic errors + optional frame logging
- `src/hooks/useVoiceConversation.ts` — greeting support, `vadSpeaking`, empty-STT recovery, dev logs
- `src/pages/ConversationPage.tsx` — pass greeting, render "I hear you…" indicator
- `src/lib/voice/sttClient.ts` and `ttsPlayer.ts` and `coachClient.ts` — dev-only logger calls only

No edge function or schema changes — those are already working.

## Out of scope

- Switching providers or models (Lovable AI Gateway STT/TTS confirmed working).
- Rewriting the UI shell.
- Removing the `OPENAI_API_KEY` secret (no longer used by the app, but harmless to leave; can be cleaned up separately).