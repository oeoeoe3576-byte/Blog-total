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
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const requestConfirm = useCallback((): Promise<boolean> => {
    if (!settings.apiKeys.openai) return Promise.resolve(false);
    if (settings.autoAllowPaidThisSession) return Promise.resolve(true);

    setModalOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [settings.apiKeys.openai, settings.autoAllowPaidThisSession]);

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
    requestConfirm,
    confirm,
    cancel,
    hasOpenAiKey: Boolean(settings.apiKeys.openai),
  };
}
