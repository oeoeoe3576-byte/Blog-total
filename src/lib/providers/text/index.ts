// 서버 전용 레지스트리. API 라우트에서만 import한다(클라이언트 번들에 fetch 어댑터가
// 섞여 들어가지 않도록 클라이언트 코드는 ./meta 만 사용해야 한다).

import type { ProviderAdapter } from "../types";
import { geminiTextAdapter } from "./gemini";
import { openaiTextAdapter } from "./openai";
import type { TextGenInput } from "./types";
import type { TextProviderId } from "./meta";

export const TEXT_ADAPTERS: Record<
  TextProviderId,
  ProviderAdapter<TextGenInput, ReadableStream<Uint8Array>>
> = {
  gemini: geminiTextAdapter,
  openai: openaiTextAdapter,
};

export type { TextGenInput };
