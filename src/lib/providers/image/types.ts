import type { Aspect } from "./meta";

export interface ImageGenInput {
  promptEn: string;
  aspect: Aspect;
  /** data: 접두사 없는 base64 JPEG. 참조 이미지를 지원하는 프로바이더(Gemini, OpenAI edits)에만 쓰인다. */
  refImageBase64?: string;
  quality?: "low" | "medium" | "high";
}
