"use client";

import { useCallback, useRef, useState } from "react";
import type { TextProviderId } from "@/lib/providers/text/meta";

const TEXT_TIMEOUT_MS = 60_000;

export interface TextGenErrorInfo {
  kind: string;
  message: string;
  provider?: string;
}

export interface GenerateTextParams {
  task: string;
  system: string;
  user: string;
  json?: boolean;
  providerOrder: TextProviderId[];
  apiKeys: { gemini?: string; openai?: string };
}

type GenerateResult =
  | { ok: true; text: string; provider: string }
  | { ok: false; error: TextGenErrorInfo };

/** /api/text를 호출해 스트리밍 텍스트를 받아오는 클라이언트 훅 (오류 방지 규칙 13: 타임아웃+취소). */
export function useTextGeneration() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<TextGenErrorInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const generate = useCallback(async (params: GenerateTextParams): Promise<GenerateResult> => {
    setError(null);
    setText("");
    setProvider(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), TEXT_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (params.apiKeys.gemini) headers["x-gemini-key"] = params.apiKeys.gemini;
      if (params.apiKeys.openai) headers["x-openai-key"] = params.apiKeys.openai;

      const res = await fetch("/api/text", {
        method: "POST",
        headers,
        body: JSON.stringify({
          task: params.task,
          system: params.system,
          user: params.user,
          json: params.json,
          providerOrder: params.providerOrder,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let info: TextGenErrorInfo = { kind: "UNKNOWN", message: "텍스트 생성에 실패했어요." };
        try {
          const body = await res.json();
          if (body?.error) info = body.error;
        } catch {
          // 응답 본문이 JSON이 아니면 기본 메시지 사용
        }
        setError(info);
        return { ok: false, error: info };
      }

      const providerId = res.headers.get("x-provider") ?? "unknown";
      setProvider(providerId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setText(full);
      }
      return { ok: true, text: full, provider: providerId };
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      const info: TextGenErrorInfo = aborted
        ? { kind: "NETWORK", message: "요청 시간이 초과되었거나 취소됐어요." }
        : {
            kind: "UNKNOWN",
            message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.",
          };
      setError(info);
      return { ok: false, error: info };
    } finally {
      clearTimeout(timeoutId);
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  return { text, isStreaming, provider, error, generate, cancel };
}
