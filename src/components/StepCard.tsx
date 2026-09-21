"use client";

import type { ReactNode } from "react";

export type StepStatus = "대기" | "생성 중" | "완료";

const STATUS_STYLE: Record<StepStatus, string> = {
  대기: "bg-orange-50 text-orange-400",
  "생성 중": "bg-orange-100 text-orange-600",
  완료: "bg-green-100 text-green-700",
};

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  status: StepStatus;
  onRestart?: () => void;
  children?: ReactNode;
}

export function StepCard({
  number,
  title,
  description,
  status,
  onRestart,
  children,
}: StepCardProps) {
  return (
    <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-md shadow-orange-100/40">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-sm font-bold text-white shadow-sm">
            {number}
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="mt-0.5 text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}
          >
            {status}
          </span>
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="rounded-full border border-orange-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-orange-50"
            >
              새로 시작
            </button>
          )}
        </div>
      </header>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
