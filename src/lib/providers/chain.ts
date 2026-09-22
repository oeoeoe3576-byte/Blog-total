// 무료 우선 → 유료 폴백 체인 실행기 (PROMPT.md 5-3)
//
// Phase 0에서는 실행기 골격만 만든다. 실제 텍스트/이미지/TTS 어댑터는
// Phase 1~4에서 이 인터페이스를 구현해 chainAdapters 배열로 전달한다.

import type { ApiKeys, ProviderAdapter, ProviderError, ProviderMeta } from "./types";

export interface ChainResult<Output> {
  output: Output;
  provider: ProviderMeta;
  /** 최종 성공 전에 시도했다가 실패해서 건너뛴 프로바이더들(원인 진단용). */
  skipped: { provider: string; message: string }[];
}

export interface RunChainOptions {
  /**
   * 다음 시도할 프로바이더가 유료일 때 호출된다.
   * false를 반환하면 체인을 중단하고 마지막 오류를 던진다.
   */
  confirmPaid?: (meta: ProviderMeta) => Promise<boolean>;
}

/**
 * adapters를 순서대로 시도한다.
 * - 키가 없는 프로바이더는 건너뛴다.
 * - AUTH/QUOTA/UNSUPPORTED/NETWORK/BAD_RESPONSE 오류는 다음 프로바이더로 넘어간다.
 * - 다음 프로바이더가 유료면 confirmPaid로 사용자 확인을 받는다(없으면 자동 진행).
 * - 모든 프로바이더가 실패하면 마지막 오류를 던진다.
 */
export async function runChain<Input, Output>(
  adapters: ProviderAdapter<Input, Output>[],
  input: Input,
  keys: ApiKeys,
  options: RunChainOptions = {},
): Promise<ChainResult<Output>> {
  let lastError: ProviderError | Error | null = null;
  const skipped: { provider: string; message: string }[] = [];

  for (const adapter of adapters) {
    if (!adapter.isAvailable(keys)) continue;

    if (adapter.meta.paid && options.confirmPaid) {
      const ok = await options.confirmPaid(adapter.meta);
      if (!ok) {
        throw lastError ?? new Error("유료 프로바이더 진행이 취소되었습니다.");
      }
    }

    try {
      const output = await adapter.run(input, keys);
      return { output, provider: adapter.meta, skipped };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      skipped.push({ provider: adapter.meta.id, message: lastError.message });
      continue;
    }
  }

  throw lastError ?? new Error("사용 가능한 프로바이더가 없습니다. 설정에서 API 키를 확인하세요.");
}
