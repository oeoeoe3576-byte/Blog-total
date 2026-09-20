import type { ProviderMeta } from "../types";

export type TtsProviderId = "edge" | "gemini" | "openai";

export const TTS_PROVIDER_META: Record<TtsProviderId, ProviderMeta> = {
  edge: { id: "edge", label: "Edge TTS", paid: false, requiresKey: null },
  gemini: { id: "gemini", label: "Gemini", paid: false, requiresKey: "gemini" },
  openai: { id: "openai", label: "OpenAI", paid: true, requiresKey: "openai" },
};

export const DEFAULT_TTS_PROVIDER_ORDER: TtsProviderId[] = ["edge", "gemini", "openai"];

export interface VoiceOption {
  id: string;
  label: string;
}

export const VOICES_BY_PROVIDER: Record<TtsProviderId, VoiceOption[]> = {
  edge: [
    { id: "ko-KR-SunHiNeural", label: "선히 (여)" },
    { id: "ko-KR-InJoonNeural", label: "인준 (남)" },
    { id: "ko-KR-HyunsuMultilingualNeural", label: "현수 (다국어)" },
  ],
  gemini: [
    { id: "Kore", label: "Kore" },
    { id: "Puck", label: "Puck" },
    { id: "Leda", label: "Leda" },
  ],
  openai: [
    { id: "alloy", label: "Alloy" },
    { id: "nova", label: "Nova" },
    { id: "shimmer", label: "Shimmer" },
  ],
};

export const MIN_RATE = 0.9;
export const MAX_RATE = 1.5;

export function clampRate(rate: number): number {
  if (Number.isNaN(rate)) return 1;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
}
