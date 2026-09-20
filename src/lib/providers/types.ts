// 프로바이더 공통 인터페이스 (PROMPT.md 5-1)
//
// 각 어댑터(텍스트/이미지/TTS)는 이 파일의 타입을 구현해야 한다.
// 실제 Gemini/OpenAI 등 어댑터 구현은 Phase 1 이후에 추가된다.

export type ErrorKind =
  | "AUTH"
  | "QUOTA"
  | "UNSUPPORTED"
  | "NETWORK"
  | "BAD_RESPONSE"
  | "UNKNOWN";

export class ProviderError extends Error {
  kind: ErrorKind;
  provider: string;

  constructor(kind: ErrorKind, provider: string, message: string) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.provider = provider;
  }
}

export interface ProviderMeta {
  id: string;
  label: string;
  paid: boolean;
  /** 이 프로바이더를 쓰려면 필요한 API 키 종류 (없으면 null) */
  requiresKey: string | null;
}

/** 설정에 저장된 API 키 모음. 값이 없으면 해당 프로바이더는 건너뛴다. */
export interface ApiKeys {
  gemini?: string;
  openai?: string;
  huggingface?: string;
  pexels?: string;
}

export interface ProviderAdapter<Input, Output> {
  meta: ProviderMeta;
  /** 키가 준비되어 있는지(=시도해볼 수 있는지) 판단. 네트워크 호출 없이 동기적으로 판단한다. */
  isAvailable: (keys: ApiKeys) => boolean;
  /** 실제 호출. 실패 시 ProviderError를 throw 한다. */
  run: (input: Input, keys: ApiKeys) => Promise<Output>;
}
