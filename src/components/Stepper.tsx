"use client";

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
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                status === "done" && "bg-[#03C75A] text-white",
                status === "active" && "bg-orange-500 text-white",
                status === "todo" && "bg-gray-200 text-gray-500",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={status === "active" ? "step" : undefined}
            >
              {step}
            </button>
            <span className="text-center text-[11px] leading-tight text-gray-600">
              {label}
            </span>
            {step < STEPS.length && (
              <span className="hidden h-px w-full border-t border-dashed border-gray-300 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
