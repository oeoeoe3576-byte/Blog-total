import type { ProviderAdapter } from "../types";
import { geminiImageAdapter } from "./gemini";
import { pollinationsImageAdapter } from "./pollinations";
import { huggingfaceImageAdapter } from "./huggingface";
import { openaiImageAdapter } from "./openai";
import type { ImageProviderId } from "./meta";
import type { ImageGenInput } from "./types";

export const IMAGE_ADAPTERS: Record<ImageProviderId, ProviderAdapter<ImageGenInput, Buffer>> = {
  gemini: geminiImageAdapter,
  pollinations: pollinationsImageAdapter,
  huggingface: huggingfaceImageAdapter,
  openai: openaiImageAdapter,
};

export type { ImageGenInput };
