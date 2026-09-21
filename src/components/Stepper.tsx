"use client";

import { Check } from "lucide-react";

const STEPS = [
  "네이버 블로그",
  "스레드",
  "클립 쇼츠 기획",
  "이미지",
  "클립 커넥트 영상",
  "발행 패키지",
];

interface StepperProps {
  progressStep: number; // 1-based, how far the data has actually progressed
  activeStep: number; // 1-based, which step's content is currently displayed
  onStepClick?: (step: number) => void;
}

export function Stepper({ progressStep, activeStep, onStepClick }: StepperProps) {
  return (
    <ol className="flex w-full items-start justify-between gap-1 overflow-x-auto px-1 py-2">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const status =
          step === activeStep ? "active" : step < progressStep ? "done" : "todo";

        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onStepClick?.(step)}
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-all",
                status === "done" && "bg-[#03C75A] text-white",
                status === "active" && "scale-110 bg-gradient-to-br from-orange-400 to-rose-400 text-white ring-4 ring-orange-100",
                status === "todo" && "bg-orange-50 text-orange-300",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={status === "active" ? "step" : undefined}
            >
              {status === "done" ? <Check size={16} strokeWidth={3} /> : step}
            </button>
            <span
              className={`text-center text-[11px] leading-tight ${status === "active" ? "font-semibold text-rose-500" : "text-gray-500"}`}
            >
              {label}
            </span>
            {step < STEPS.length && (
              <span className="hidden h-px w-full border-t border-dashed border-orange-200 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
