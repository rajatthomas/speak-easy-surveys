## Goal

Replace the unreliable VAD-based turn-taking with an explicit push-to-talk button. The user taps once to start recording, taps again to stop — the bot then transcribes, replies, and speaks back.

## UX

- The mic button on `ConversationPage` becomes the single control:
  - Idle → tap to start the session (greeting plays).
  - After greeting → button shows "Tap to talk" (mic icon).
  - While recording → button shows "Tap to send" with a red pulse + live "Listening…" indicator.
  - While transcribing / AI thinking → button disabled, shows "Thinking…".
  - While AI speaking → button shows "Speaking…" (optional tap = interrupt/stop playback).
- Remove the "I hear you…" VAD indicator; replace with a simple recording timer or waveform pulse.

## Technical changes

1. **New recorder** `src/lib/voice/recorder.ts`
   - Uses `getUserMedia` + `MediaRecorder` (or `AudioWorklet` fallback) to capture mic audio.
   - `start()` opens the stream and begins recording; `stop()` returns a 16 kHz mono 16-bit PCM WAV `Blob` ready for the existing `sttClient`.
   - Encapsulates the WAV-encoding logic currently inside `vad.ts`.

2. **Delete VAD path**
   - Remove `src/lib/voice/vad.ts` and the `@ricky0123/vad-web` / onnxruntime dependency from `package.json`.
   - Drop all `vadSpeaking`, `onVADMisfire`, `onFrameProcessed` plumbing.

3. **Rewrite `src/hooks/useVoiceConversation.ts`** around an explicit state machine:
   `idle → greeting → ready → recording → transcribing → thinking → speaking → ready`
   - `start()` — play greeting, then enter `ready`.
   - `toggleTalk()` — in `ready` starts recorder + sets `recording`; in `recording` stops recorder, runs STT → coach → TTS, returns to `ready`.
   - `stop()` — tears down recorder, TTS, and coach stream.
   - Keep the existing `sttClient`, `coachClient`, `ttsPlayer`, and `waitForPlayback` logic — only the trigger changes.
   - Keep the empty-STT recovery toast.

4. **Update `src/pages/ConversationPage.tsx`**
   - Replace the auto-listening UI with a large circular push-to-talk button driven by the new state.
   - Show contextual label + recording timer.
   - Remove `vadSpeaking` reference.

5. **Logger** — keep dev `[voice]` logs at each state transition for debugging.

## Out of scope

- No edge function changes (`stt`, `coach`, `tts` stay as-is).
- No schema/RLS changes.
- No changes to greeting copy or coach prompt.

## Files touched

- add `src/lib/voice/recorder.ts`
- delete `src/lib/voice/vad.ts`
- edit `src/hooks/useVoiceConversation.ts`
- edit `src/pages/ConversationPage.tsx`
- edit `package.json` (remove VAD deps)
