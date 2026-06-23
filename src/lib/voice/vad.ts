import { MicVAD, utils } from "@ricky0123/vad-web";

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
  const vad = await MicVAD.new({
    model: "v5",
    baseAssetPath: BASE_ASSET_PATH,
    onnxWASMBasePath: ONNX_WASM_PATH,
    positiveSpeechThreshold: opts.positiveSpeechThreshold ?? 0.5,
    negativeSpeechThreshold: opts.negativeSpeechThreshold ?? 0.35,
    minSpeechMs: opts.minSpeechMs ?? 250,
    redemptionMs: opts.redemptionMs ?? 800,
    preSpeechPadMs: opts.preSpeechPadMs ?? 200,
    onSpeechStart: () => cb.onSpeechStart?.(),
    onVADMisfire: () => cb.onVADMisfire?.(),
    onSpeechEnd: (audio: Float32Array) => {
      const wavBuf = utils.encodeWAV(audio);
      const blob = new Blob([wavBuf], { type: "audio/wav" });
      cb.onSpeechEnd?.(blob);
    },
  });
  return vad;
}

export type VADInstance = Awaited<ReturnType<typeof createVAD>>;