"use client";

import { useCallback, useState } from "react";
import type { ZodType } from "zod";
import { parseJsonLenient } from "@/lib/parse";
import { useTextGeneration, type GenerateTextParams, type TextGenErrorInfo } from "./useTextGeneration";

type JsonGenResult<T> =
  | { ok: true; data: T; provider: string }
  | { ok: false; error: TextGenErrorInfo };

const RETRY_INSTRUCTION =
  "\n\n방금 응답이 올바른 JSON 형식이 아니었어요. 다른 설명 없이, 스키마에 맞는 JSON 객체 하나만 다시 출력하세요.";

/**
 * JSON 응답이 필요한 생성에 쓰는 훅. 오류 방지 규칙 7:
 * 파싱 실패 시 "JSON만 다시 출력" 지시를 덧붙여 1회 자동 재시도한다.
 */
export function useJsonGeneration<T>(schema: ZodType<T>) {
  const base = useTextGeneration();
  const [data, setData] = useState<T | null>(null);
  const [rawOnFailure, setRawOnFailure] = useState<string | null>(null);

  const generate = useCallback(
    async (params: GenerateTextParams): Promise<JsonGenResult<T>> => {
      setData(null);
      setRawOnFailure(null);

      const first = await base.generate({ ...params, json: true });
      if (!first.ok) return first;

      let parsed = parseJsonLenient(first.text, schema);
      let provider = first.provider;

      if (!parsed.ok) {
        const retry = await base.generate({
          ...params,
          json: true,
          user: params.user + RETRY_INSTRUCTION,
        });
        if (!retry.ok) return retry;

        provider = retry.provider;
        parsed = parseJsonLenient(retry.text, schema);

        if (!parsed.ok) {
          setRawOnFailure(retry.text);
          return {
            ok: false,
            error: { kind: "BAD_RESPONSE", message: "JSON 형식이 올바르지 않아요: " + parsed.error },
          };
        }
      }

      setData(parsed.data);
      return { ok: true, data: parsed.data, provider };
    },
    [base, schema],
  );

  return { ...base, data, rawOnFailure, generate };
}
