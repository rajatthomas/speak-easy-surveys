
## Why

The current voice conversation uses OpenAI's Realtime ephemeral-session API, and the upstream endpoint is now returning 404 (`Invalid URL (POST /v1/realtime/sessions)`) — which is why sessions fail to start. Beyond the outage, the architecture also requires a user-supplied `OPENAI_API_KEY` and offers no client-side control over turn-taking.

This plan rewrites the voice pipeline around the current best-practice stack and removes the OpenAI dependency. The rest of the app (auth, dashboard, admin panel, sessions list, DISC profile, settings, summaries) is untouched.

## New voice architecture

```text
 mic ──► browser VAD (Silero / @ricky0123/vad-web)
            │  emits "speech ended" with the captured utterance
            ▼
   /functions/v1/stt  ──►  Lovable AI  (openai/gpt-4o-mini-transcribe, SSE)
            │  streamed transcript deltas
            ▼
   /functions/v1/coach ──►  Lovable AI  (google/gemini-3-flash-preview, streamText)
            │  streamed assistant text + saved to transcript
            ▼
   /functions/v1/tts  ──►  Lovable AI  (openai/gpt-4o-mini-tts, SSE, PCM)
            │  base64 PCM chunks
            ▼
        Web Audio playback (chunked, low-latency)
```

Key properties:
- **Client-side VAD for turn-taking.** Silero VAD runs in the browser via `@ricky0123/vad-web`; we use its `onSpeechEnd` to close each user turn and `onSpeechStart` to barge-in (cancel TTS playback + abort in-flight assistant response). Sensitivity (threshold, min speech ms, redemption ms) is tunable in Settings.
- **Streaming STT.** Each captured utterance is uploaded to a `stt` edge function that proxies Lovable AI's `/audio/transcriptions` SSE stream; the UI shows interim deltas in the user bubble.
- **Streaming LLM.** A `coach` edge function uses the AI SDK `streamText` against `google/gemini-3-flash-preview`, loads the active system prompt from `system_prompts`, and persists the full assistant turn to the session transcript.
- **Streaming TTS.** A `tts` edge function proxies Lovable AI's `/audio/speech` SSE with `response_format: "pcm"`; the client decodes deltas and schedules them on an `AudioContext` for sub-second time-to-first-audio. Long assistant turns are chunked at sentence boundaries.
- **Barge-in.** When VAD detects new user speech mid-TTS, we stop the `AudioContext` scheduling and abort the coach fetch so the user can interrupt naturally.

## Files

New
- `src/lib/voice/vad.ts` — Silero VAD wrapper (load, start/stop, callbacks, sensitivity config).
- `src/lib/voice/sttClient.ts` — uploads utterance Blob, parses SSE deltas, returns final transcript.
- `src/lib/voice/ttsPlayer.ts` — fetches TTS SSE, decodes base64 PCM, schedules on a shared `AudioContext`, supports `stop()` for barge-in.
- `src/lib/voice/coachClient.ts` — calls `/functions/v1/coach` with message history, yields streamed text, supports abort.
- `src/hooks/useVoiceConversation.ts` — orchestrates VAD → STT → coach → TTS state machine, exposes `status`, `messages`, `start`, `stop`, `interrupt`.
- `supabase/functions/stt/index.ts` — JWT-validated multipart proxy to Lovable AI transcriptions (SSE passthrough).
- `supabase/functions/coach/index.ts` — JWT-validated `streamText` chat endpoint; loads active prompt; appends turns to `session_messages`.
- `supabase/functions/tts/index.ts` — JWT-validated JSON proxy to Lovable AI speech (SSE passthrough).

Rewritten
- `src/pages/ConversationPage.tsx` — uses `useVoiceConversation`; shows live waveform, VAD state ("listening / you're talking / thinking / speaking"), interim + final transcripts, barge-in.
- `src/components/VoiceButton.tsx` / `AudioWaveform.tsx` — driven by VAD state instead of manual push-to-talk.

Removed
- `supabase/functions/realtime-session/` (and any client code that called it / referenced `OPENAI_API_KEY`).

Unchanged
- `AdminPage`, `DashboardPage`, `SessionsPage`, `DISCProfilePage`, `SettingsPage` (we add VAD sensitivity controls here), `generate-session-summary`, `check-admin`, auth, RLS, `system_prompts` schema.

## Secrets

- No new user secrets. `LOVABLE_API_KEY` is already available to edge functions.
- `OPENAI_API_KEY` is no longer required by the app; we'll leave the secret in place (harmless) and stop reading it.

## Open question

The rewrite keeps the existing transcript storage, sessions list, summary generation, and admin/DISC features intact — only the voice engine changes. Confirm that's what you mean by "rewrite the whole app," or tell me if you'd also like the UI shell redesigned in the same pass.
