"use client";

import { useCallback, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

/**
 * "무료 실패 → 유료 확인" 흐름을 프라미스로 감싼 훅 (PROMPT.md 5-3).
 * 사용법: const proceed = await paidConfirm.requestConfirm();
 *         proceed === false 면 진행하지 않는다(키 없음 또는 사용자가 취소).
 */
export function usePaidConfirm() {
  const settings = useAppStore((s) => s.settings);
  const [modalOpen, setModalOpen] = useState(false);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  /** freeErrorMessage: 무료 프로바이더가 왜 실패했는지(예: Gemini 에러 메시지). 화면에 그대로 보여준다. */
  const requestConfirm = useCallback(
    (freeErrorMessage?: string): Promise<boolean> => {
      setFailureReason(freeErrorMessage ?? null);
      if (!settings.apiKeys.openai) return Promise.resolve(false);
      if (settings.autoAllowPaidThisSession) return Promise.resolve(true);

      setModalOpen(true);
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [settings.apiKeys.openai, settings.autoAllowPaidThisSession],
  );

  const confirm = useCallback(() => {
    setModalOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    setModalOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  return {
    modalOpen,
    failureReason,
    requestConfirm,
    confirm,
    cancel,
    hasOpenAiKey: Boolean(settings.apiKeys.openai),
  };
}
