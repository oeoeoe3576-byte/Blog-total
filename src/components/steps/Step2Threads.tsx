"use client";

import { useState } from "react";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTextGeneration } from "@/hooks/useTextGeneration";
import { usePaidConfirm } from "@/hooks/usePaidConfirm";
import { buildThreadsSystemPrompt, buildThreadsUserPrompt, THREADS_MAX_CHARS } from "@/lib/prompts/threads";
import { parseThreadsOutput } from "@/lib/parse";
import { copyRichText } from "@/lib/clipboard";
import { ROUGH_COST_WON } from "@/lib/cost";
import { CostConfirmModal } from "@/components/CostConfirmModal";
import { ProviderBadge } from "@/components/ProviderBadge";
import { DEMO_THREADS_RAW } from "@/fixtures/demo";

function exceedsLimit(result: { main: string; replies: string[] }): boolean {
  return result.main.length > THREADS_MAX_CHARS || result.replies.some((r) => r.length > THREADS_MAX_CHARS);
}

function truncate(text: string): string {
  return text.length > THREADS_MAX_CHARS ? text.slice(0, THREADS_MAX_CHARS - 1) + "…" : text;
}

export function Step2Threads() {
  const settings = useAppStore((s) => s.settings);
  const product = useAppStore((s) => s.product);
  const blogResult = useAppStore((s) => s.blogResult);
  const threadsResult = useAppStore((s) => s.threadsResult);
  const setThreadsResult = useAppStore((s) => s.setThreadsResult);
  const addSessionCost = useAppStore((s) => s.addSessionCost);

  const { text: streamedText, isStreaming, generate } = useTextGeneration();
  const paidConfirm = usePaidConfirm();
  const [demoLoading, setDemoLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lengthWarning, setLengthWarning] = useState(false);

  const busy = isStreaming || demoLoading;
  const canGenerate = Boolean(blogResult?.bodyMarkdown);

  const runGeneration = async () => {
    setLastError(null);
    setLengthWarning(false);
    if (!blogResult) return;

    if (settings.demoMode) {
      setDemoLoading(true);
      await new Promise((r) => setTimeout(r, 400));
      const parsed = parseThreadsOutput(DEMO_THREADS_RAW);
      setThreadsResult({ ...parsed, provider: "데모" });
      setDemoLoading(false);
      return;
    }

    const experience = product?.experience ?? "researched";
    const system = buildThreadsSystemPrompt(experience);
    const user = buildThreadsUserPrompt(blogResult.bodyMarkdown);

    const attempt = (providerOrder: ("gemini" | "openai")[]) =>
      generate({ task: "threads", system, user, providerOrder, apiKeys: settings.apiKeys });

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

    let parsed = parseThreadsOutput(result.text);

    if (exceedsLimit(parsed)) {
      const retry = await generate({
        task: "threads",
        system,
        user: user + `\n\n각 글은 반드시 ${THREADS_MAX_CHARS}자 이내여야 합니다. 더 짧게 다시 작성하세요.`,
        providerOrder: [result.provider as "gemini" | "openai"],
        apiKeys: settings.apiKeys,
      });

      if (retry.ok) {
        const retryParsed = parseThreadsOutput(retry.text);
        if (!exceedsLimit(retryParsed)) {
          parsed = retryParsed;
        } else {
          parsed = {
            main: truncate(retryParsed.main),
            replies: retryParsed.replies.map(truncate),
          };
          setLengthWarning(true);
        }
      } else {
        parsed = { main: truncate(parsed.main), replies: parsed.replies.map(truncate) };
        setLengthWarning(true);
      }
    }

    setThreadsResult({ ...parsed, provider: result.provider });
  };

  const handleCopy = async (text: string) => {
    await copyRichText(text, `<p>${text.replace(/\n/g, "<br />")}</p>`);
  };

  const handleCopyAll = async () => {
    if (!threadsResult) return;
    const all = [threadsResult.main, ...threadsResult.replies].join("\n\n---\n\n");
    await handleCopy(all);
  };

  return (
    <div className="flex flex-col gap-4">
      {!blogResult && (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
          먼저 ① 네이버 블로그 단계에서 글을 생성해야 스레드 게시글을 만들 수 있어요.
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canGenerate || busy}
          onClick={runGeneration}
          className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? "생성 중..." : "스레드 게시글 생성"}
        </button>
        {threadsResult && (
          <button
            type="button"
            disabled={busy}
            onClick={runGeneration}
            className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> 다시 생성
          </button>
        )}
      </div>

      {isStreaming && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-500">
          {streamedText || "생성을 시작하고 있어요..."}
        </div>
      )}

      {lastError && !isStreaming && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">스레드 생성에 실패했어요: {lastError}</p>
          <button
            type="button"
            onClick={runGeneration}
            className="mt-2 rounded-xl border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      )}

      {lengthWarning && (
        <p className="text-xs text-orange-500">
          일부 글이 {THREADS_MAX_CHARS}자를 넘어 자동으로 잘랐어요. 필요하면 직접 다듬어 주세요.
        </p>
      )}

      {threadsResult && !isStreaming && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">결과</span>
            <ProviderBadge provider={threadsResult.provider} />
          </div>

          <ThreadPostCard label="메인 포스트" text={threadsResult.main} onCopy={handleCopy} />
          {threadsResult.replies.map((reply, i) => (
            <ThreadPostCard key={i} label={`댓글 ${i + 1}`} text={reply} onCopy={handleCopy} />
          ))}

          <button
            type="button"
            onClick={handleCopyAll}
            className="flex w-fit items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-medium text-white"
          >
            <Copy size={14} /> 전체 복사
          </button>
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

function ThreadPostCard({
  label,
  text,
  onCopy,
}: {
  label: string;
  text: string;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">
          {label} ({text.length}/{THREADS_MAX_CHARS}자)
        </span>
        <button
          type="button"
          onClick={() => onCopy(text)}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          복사
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm text-gray-700">{text}</p>
    </div>
  );
}
