"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Stepper } from "@/components/Stepper";
import { StepCard, type StepStatus } from "@/components/StepCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { StoreHydrator } from "@/components/StoreHydrator";
import { Step1Blog } from "@/components/steps/Step1Blog";
import { useAppStore } from "@/lib/store";

const STEP_DEFS: { title: string; description: string }[] = [
  { title: "네이버 블로그", description: "제목 후보, 본문, 해시태그를 생성해요." },
  { title: "스레드 (선택)", description: "블로그 글을 바탕으로 스레드 게시글을 만들어요." },
  { title: "클립 쇼츠 기획", description: "30~50초 분량의 장면별 대본을 기획해요." },
  { title: "이미지", description: "장면별 이미지를 확보하고 비율에 맞게 준비해요." },
  { title: "클립 커넥트 영상", description: "자막과 더빙이 입혀진 9:16 영상을 만들어요." },
  { title: "발행 패키지", description: "완성된 결과물을 ZIP으로 모아 다운로드해요." },
];

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const demoMode = useAppStore((s) => s.settings.demoMode);
  const blogResult = useAppStore((s) => s.blogResult);
  const resetBlog = useAppStore((s) => s.resetBlog);

  return (
    <>
      <StoreHydrator />

      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              블로그 올인원 AI 에이전트
            </h1>
            {hasHydrated && demoMode && (
              <p className="text-xs font-medium text-orange-500">
                데모 모드 — API를 호출하지 않고 샘플 데이터로 동작해요
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="설정 열기"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <Settings size={20} />
          </button>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <Stepper currentStep={blogResult ? 2 : 1} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        {STEP_DEFS.map((def, i) => {
          if (i === 0) {
            const status: StepStatus = blogResult ? "완료" : "대기";
            return (
              <StepCard
                key={def.title}
                number={1}
                title={def.title}
                description={def.description}
                status={status}
                onRestart={blogResult ? resetBlog : undefined}
              >
                <Step1Blog />
              </StepCard>
            );
          }

          return (
            <StepCard
              key={def.title}
              number={i + 1}
              title={def.title}
              description={def.description}
              status="대기"
            >
              <p className="text-sm text-gray-400">
                이 단계는 다음 Phase에서 구현돼요.
              </p>
            </StepCard>
          );
        })}
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
