"use client";

import { useMemo, useState } from "react";
import { Copy, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useJsonGeneration } from "@/hooks/useJsonGeneration";
import { usePaidConfirm } from "@/hooks/usePaidConfirm";
import { buildScriptSystemPrompt, buildScriptUserPrompt } from "@/lib/prompts/script";
import { scriptResponseSchema } from "@/lib/schemas";
import { copyRichText } from "@/lib/clipboard";
import { ROUGH_COST_WON } from "@/lib/cost";
import { CostConfirmModal } from "@/components/CostConfirmModal";
import { ProviderBadge } from "@/components/ProviderBadge";
import { DEMO_SCENES } from "@/fixtures/demo";
import type { Scene, SceneKind } from "@/lib/types";

const KIND_LABEL: Record<SceneKind, string> = { hook: "훅", scene: "장면", cta: "CTA" };
const SYLLABLES_PER_SECOND = 5.5;

type Tab = "plan" | "paste" | "copy";

function toScenes(scenes: { kind: SceneKind; headline: string; narration: string }[]): Scene[] {
  return scenes.map((s, i) => ({ id: `scene-${Date.now()}-${i}`, ...s }));
}

function formatSceneCopy(scenes: Scene[]): string {
  return scenes
    .map((s) => `[${KIND_LABEL[s.kind]}] (자막: ${s.headline}) ${s.narration}`)
    .join("\n\n");
}

export function Step3Script() {
  const settings = useAppStore((s) => s.settings);
  const product = useAppStore((s) => s.product);
  const blogResult = useAppStore((s) => s.blogResult);
  const scenes = useAppStore((s) => s.scenes);
  const setScenes = useAppStore((s) => s.setScenes);
  const updateScene = useAppStore((s) => s.updateScene);
  const addSessionCost = useAppStore((s) => s.addSessionCost);

  const { text: streamedText, isStreaming, generate, provider } = useJsonGeneration(
    scriptResponseSchema,
  );
  const paidConfirm = usePaidConfirm();

  const [tab, setTab] = useState<Tab>("plan");
  const [pastedText, setPastedText] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const busy = isStreaming || demoLoading;
  const sourceText = tab === "paste" ? pastedText.trim() : blogResult?.bodyMarkdown ?? "";
  const canGenerate = Boolean(sourceText);

  const totalChars = useMemo(
    () => (scenes ?? []).reduce((sum, s) => sum + s.narration.length, 0),
    [scenes],
  );
  const estimatedSeconds = Math.round(totalChars / SYLLABLES_PER_SECOND);

  const runGeneration = async () => {
    setLastError(null);
    if (!sourceText) return;

    if (settings.demoMode) {
      setDemoLoading(true);
      await new Promise((r) => setTimeout(r, 400));
      setScenes(DEMO_SCENES);
      setDemoLoading(false);
      return;
    }

    const experience = product?.experience ?? "researched";
    const system = buildScriptSystemPrompt(experience);
    const user = buildScriptUserPrompt(sourceText);

    const attempt = (providerOrder: ("gemini" | "openai")[]) =>
      generate({ task: "script", system, user, providerOrder, apiKeys: settings.apiKeys });

    let result = await attempt(["gemini"]);
    if (!result.ok) {
      const proceed = await paidConfirm.requestConfirm();
      if (!proceed) {
        setLastError(result.error.message);
        return;
      }
      result = await attempt(["openai"]);
      if (!result.ok) {
        setLastError(result.error.message);
        return;
      }
      addSessionCost(ROUGH_COST_WON.textGeneration);
    }

    setScenes(toScenes(result.data.scenes));
  };

  const handleCopyAll = async () => {
    if (!scenes) return;
    const text = formatSceneCopy(scenes);
    await copyRichText(text, `<pre>${text}</pre>`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {(
          [
            ["plan", "클립 대본 기획"],
            ["paste", "글 붙여넣기"],
            ["copy", "대본 복사"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
              tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plan" && (
        <>
          {!blogResult && (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
              ① 네이버 블로그 글을 먼저 생성하면 자동으로 참고 자료로 사용돼요. 없다면 &quot;글
              붙여넣기&quot; 탭을 이용하세요.
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canGenerate || busy}
              onClick={runGeneration}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {busy ? "기획 중..." : "대본 기획하기"}
            </button>
            {scenes && (
              <button
                type="button"
                disabled={busy}
                onClick={runGeneration}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw size={14} /> 다시 기획
              </button>
            )}
          </div>
        </>
      )}

      {tab === "paste" && (
        <div className="flex flex-col gap-2">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            disabled={busy}
            rows={6}
            placeholder="대본 기획의 참고 자료로 쓸 글을 붙여넣으세요."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
          />
          <button
            type="button"
            disabled={!canGenerate || busy}
            onClick={runGeneration}
            className="flex w-fit items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? "기획 중..." : "대본 기획하기"}
          </button>
        </div>
      )}

      {tab === "copy" &&
        (scenes ? (
          <div className="flex flex-col gap-2">
            <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              {formatSceneCopy(scenes)}
            </pre>
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex w-fit items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              <Copy size={14} /> 복사
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">아직 기획된 대본이 없어요.</p>
        ))}

      {isStreaming && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-500">
          {streamedText || "기획을 시작하고 있어요..."}
        </div>
      )}

      {lastError && !isStreaming && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">대본 기획에 실패했어요: {lastError}</p>
          <button
            type="button"
            onClick={runGeneration}
            className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      )}

      {scenes && !isStreaming && tab !== "copy" && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              장면 {scenes.length}개 · 예상 낭독 {estimatedSeconds}초
            </span>
            <ProviderBadge provider={provider ?? undefined} />
          </div>

          {estimatedSeconds > 50 && (
            <p className="text-xs text-orange-500">
              50초를 넘었어요. 내레이션을 조금 줄여보세요.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {scenes.map((scene) => (
              <div key={scene.id} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <select
                    value={scene.kind}
                    onChange={(e) => updateScene(scene.id, { kind: e.target.value as SceneKind })}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                  >
                    <option value="hook">훅</option>
                    <option value="scene">장면</option>
                    <option value="cta">CTA</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setScenes(scenes.filter((s) => s.id !== scene.id))}
                    className="text-gray-300 hover:text-red-500"
                    aria-label="장면 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  value={scene.headline}
                  onChange={(e) => updateScene(scene.id, { headline: e.target.value })}
                  placeholder="자막 (예: [[핵심어]] 강조)"
                  className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-gray-900"
                />
                <textarea
                  value={scene.narration}
                  onChange={(e) => updateScene(scene.id, { narration: e.target.value })}
                  rows={2}
                  placeholder="내레이션"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-gray-900"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            기획한 장면은 ④ 이미지에서 장면별 이미지로, ⑤ 클립 커넥트 영상에서 자막·더빙이 입혀진
            영상으로 이어져요.
          </p>
        </div>
      )}

      <CostConfirmModal
        open={paidConfirm.modalOpen}
        estimatedWon={ROUGH_COST_WON.textGeneration}
        onCancel={paidConfirm.cancel}
        onConfirm={paidConfirm.confirm}
      />
    </div>
  );
}
