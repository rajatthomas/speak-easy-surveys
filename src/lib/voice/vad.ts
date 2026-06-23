import { MicVAD, utils } from "@ricky0123/vad-web";
import { logger } from "@/lib/logger";

export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: (wavBlob: Blob) => void;
  onVADMisfire?: () => void;
}

export interface VADOptions {
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  minSpeechMs?: number;
  redemptionMs?: number;
  preSpeechPadMs?: number;
}

const BASE_ASSET_PATH = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";
const ONNX_WASM_PATH = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";

export async function createVAD(cb: VADCallbacks, opts: VADOptions = {}) {
  try {
    const vad = await MicVAD.new({
      // Legacy Silero is more forgiving for typical browser mic input than v5.
      baseAssetPath: BASE_ASSET_PATH,
      onnxWASMBasePath: ONNX_WASM_PATH,
      positiveSpeechThreshold: opts.positiveSpeechThreshold ?? 0.35,
      negativeSpeechThreshold: opts.negativeSpeechThreshold ?? 0.25,
      minSpeechMs: opts.minSpeechMs ?? 250,
      redemptionMs: opts.redemptionMs ?? 500,
      preSpeechPadMs: opts.preSpeechPadMs ?? 200,
      onSpeechStart: () => {
        logger.log("[VAD] speech start");
        cb.onSpeechStart?.();
      },
      onVADMisfire: () => {
        logger.log("[VAD] misfire");
        cb.onVADMisfire?.();
      },
      onSpeechEnd: (audio: Float32Array) => {
        const wavBuf = utils.encodeWAV(audio);
        const blob = new Blob([wavBuf], { type: "audio/wav" });
        logger.log("[VAD] speech end, samples=", audio.length, "bytes=", blob.size);
        cb.onSpeechEnd?.(blob);
      },
    });
    return vad;
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
}

export type VADInstance = Awaited<ReturnType<typeof createVAD>>;