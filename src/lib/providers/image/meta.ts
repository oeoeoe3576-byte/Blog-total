import type { ProviderMeta } from "../types";

export type ImageProviderId = "gemini" | "pollinations" | "huggingface" | "openai";

export const IMAGE_PROVIDER_META: Record<ImageProviderId, ProviderMeta> = {
  gemini: { id: "gemini", label: "Gemini", paid: false, requiresKey: "gemini" },
  pollinations: { id: "pollinations", label: "Pollinations", paid: false, requiresKey: null },
  huggingface: { id: "huggingface", label: "Hugging Face", paid: false, requiresKey: "huggingface" },
  openai: { id: "openai", label: "OpenAI", paid: true, requiresKey: "openai" },
};

/**
 * 상품 사진 사용은 API 호출이 아니라 클라이언트에서 바로 처리하므로 체인에 포함하지 않는다.
 * Hugging Face(FLUX.1-schnell)를 Pollinations보다 먼저 둔다 — Pollinations는 키 없이 항상
 * 응답을 주는 경우가 많아서, 뒤에 있으면 품질이 더 나은 무료 옵션까지 갈 일이 거의 없다.
 */
export const DEFAULT_IMAGE_PROVIDER_ORDER: ImageProviderId[] = [
  "gemini",
  "huggingface",
  "pollinations",
  "openai",
];

export type Aspect = "9:16" | "16:9" | "1:1";

export const ASPECT_SIZES: Record<Aspect, { width: number; height: number }> = {
  "9:16": { width: 768, height: 1365 },
  "16:9": { width: 1365, height: 768 },
  "1:1": { width: 1024, height: 1024 },
};
