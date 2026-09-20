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
  // 2026-09 기준 안정 버전. gemini-3.x flash가 더 최신이지만 무료 한도/문서가
  // 상대적으로 덜 검증되어 기본값은 보수적으로 2.5-flash로 둔다(README "확인 필요" 참고).
  gemini: "gemini-2.5-flash",
  openai: "gpt-5-mini",
};
