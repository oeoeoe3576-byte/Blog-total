// 텍스트 프로바이더 메타데이터. 실제 fetch 어댑터(gemini.ts/openai.ts)와 달리
// 클라이언트 컴포넌트에서도 안전하게 import할 수 있다(부작용/키 사용 없음).

import type { ProviderMeta } from "../types";

export type TextProviderId = "gemini" | "openai";

export const TEXT_PROVIDER_META: Record<TextProviderId, ProviderMeta> = {
  gemini: { id: "gemini", label: "Gemini", paid: false, requiresKey: "gemini" },
  openai: { id: "openai", label: "OpenAI", paid: true, requiresKey: "openai" },
};

export const DEFAULT_TEXT_PROVIDER_ORDER: TextProviderId[] = ["gemini", "openai"];

/** Gemini/OpenAI 텍스트 모델 기본값. 설정 화면에서 사용자가 바꿀 수 있다. */
export const DEFAULT_TEXT_MODEL: Record<TextProviderId, string> = {
  // gemini-2.5-flash는 2026-09 기준 신규 사용자에게 더 이상 제공되지 않는다(실사용 중 API가
  // "This model models/gemini-2.5-flash is no longer available to new users. Please update
  // your code to use models/gemini-3.6-flash" 에러를 반환하는 것을 확인함). gemini-3.6-flash로 갱신.
  gemini: "gemini-3.6-flash",
  openai: "gpt-5-mini",
};
