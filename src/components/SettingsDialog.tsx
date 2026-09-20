"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ApiKeys } from "@/lib/providers/types";

interface KeyField {
  id: keyof ApiKeys;
  label: string;
  helpUrl?: string;
}

const KEY_FIELDS: KeyField[] = [
  { id: "gemini", label: "Gemini API 키" },
  { id: "openai", label: "OpenAI API 키" },
  { id: "huggingface", label: "Hugging Face 토큰" },
  { id: "pexels", label: "Pexels API 키" },
];

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const settings = useAppStore((s) => s.settings);
  const cost = useAppStore((s) => s.cost);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const clearApiKey = useAppStore((s) => s.clearApiKey);
  const setDemoMode = useAppStore((s) => s.setDemoMode);
  const setAutoAllowPaidThisSession = useAppStore(
    (s) => s.setAutoAllowPaidThisSession,
  );

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">설정</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="설정 닫기"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          이번 세션 예상 누적 비용:{" "}
          <span className="font-semibold text-gray-900">
            약 {cost.sessionEstimatedCostWon.toLocaleString("ko-KR")}원
          </span>
        </div>

        <section className="mt-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">API 키</h3>
          {KEY_FIELDS.map(({ id, label }) => {
            const saved = settings.apiKeys[id];
            const draft = drafts[id] ?? "";
            return (
              <div key={id} className="flex flex-col gap-1.5">
                <label htmlFor={`key-${id}`} className="text-xs font-medium text-gray-600">
                  {label}
                </label>
                <div className="flex gap-2">
                  <input
                    id={`key-${id}`}
                    type="password"
                    autoComplete="off"
                    placeholder={saved ? "저장됨 (변경하려면 새 키 입력)" : "키를 입력하세요"}
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [id]: e.target.value }))
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-900"
                  />
                  <button
                    type="button"
                    disabled={!draft}
                    onClick={() => {
                      setApiKey(id, draft);
                      setDrafts((d) => ({ ...d, [id]: "" }));
                    }}
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    disabled={!saved}
                    onClick={() => clearApiKey(id)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 disabled:opacity-30"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-400">
            키는 브라우저(localStorage)에만 저장되고, 서버로는 요청 시에만 헤더로 전달돼요.
          </p>
        </section>

        <section className="mt-5 space-y-3 border-t border-gray-100 pt-4">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700">데모 모드 (API 호출 없이 샘플 데이터로 전체 흐름 확인)</span>
            <input
              type="checkbox"
              checked={settings.demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700">이번 세션 유료 자동 허용</span>
            <input
              type="checkbox"
              checked={settings.autoAllowPaidThisSession}
              onChange={(e) => setAutoAllowPaidThisSession(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </section>
      </div>
    </div>
  );
}
