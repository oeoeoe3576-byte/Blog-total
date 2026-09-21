"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";

interface CostConfirmModalProps {
  open: boolean;
  estimatedWon: number;
  failureReason?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CostConfirmModal({
  open,
  estimatedWon,
  failureReason,
  onCancel,
  onConfirm,
}: CostConfirmModalProps) {
  const setAutoAllowPaidThisSession = useAppStore((s) => s.setAutoAllowPaidThisSession);
  const [autoAllow, setAutoAllow] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-bold text-gray-900">유료로 진행할까요?</h3>
        <p className="mt-2 text-sm text-gray-600">
          무료 방식이 실패했어요. OpenAI 유료로 진행할까요? 예상 비용 약{" "}
          <span className="font-semibold text-gray-900">
            {estimatedWon.toLocaleString("ko-KR")}원
          </span>
          입니다.
        </p>

        {failureReason && (
          <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
            <span className="font-medium">실패 이유: </span>
            {failureReason}
          </div>
        )}

        <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={autoAllow}
            onChange={(e) => setAutoAllow(e.target.checked)}
            className="h-4 w-4"
          />
          이번 세션은 자동 허용
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (autoAllow) setAutoAllowPaidThisSession(true);
              onConfirm();
            }}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
          >
            유료로 진행
          </button>
        </div>
      </div>
    </div>
  );
}
