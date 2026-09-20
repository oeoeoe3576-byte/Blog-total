import type { ProviderAdapter } from "../types";
import { edgeTtsAdapter } from "./edge";
import { geminiTtsAdapter } from "./gemini";
import { openaiTtsAdapter } from "./openai";
import type { TtsProviderId } from "./meta";
import type { TtsInput, TtsOutput } from "./types";

export const TTS_ADAPTERS: Record<TtsProviderId, ProviderAdapter<TtsInput, TtsOutput>> = {
  edge: edgeTtsAdapter,
  gemini: geminiTtsAdapter,
  openai: openaiTtsAdapter,
};

export type { TtsInput, TtsOutput };
