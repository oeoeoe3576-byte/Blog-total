"use client";

import { useState } from "react";
import { Copy, Loader2, RefreshCw, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ProviderBadge } from "@/components/ProviderBadge";
import { useTextGeneration, type TextGenErrorInfo } from "@/hooks/useTextGeneration";
import { usePaidConfirm } from "@/hooks/usePaidConfirm";
import { buildBlogSystemPrompt, buildBlogUserPrompt } from "@/lib/prompts/blog";
import { parseBlogOutput } from "@/lib/parse";
import { copyRichText, markdownToSimpleHtml } from "@/lib/clipboard";
import { ROUGH_COST_WON } from "@/lib/cost";
import { CostConfirmModal } from "@/components/CostConfirmModal";
import { DEMO_BLOG_RAW, DEMO_PRODUCT } from "@/fixtures/demo";
import type { Experience, Product } from "@/lib/types";

function withDisclosure(body: string, disclosure: string): string {
  return [disclosure, body, disclosure].join("\n\n");
}

function errorHint(error: TextGenErrorInfo): string {
  switch (error.kind) {
    case "AUTH":
      return "API 키를 다시 확인해 주세요.";
    case "QUOTA":
      return "사용량 한도에 도달했을 수 있어요. 잠시 후 다시 시도하거나 다른 프로바이더를 사용해 보세요.";
    case "NETWORK":
      return "네트워크 상태를 확인한 뒤 다시 시도해 주세요.";
    default:
      return "잠시 후 다시 시도해 주세요.";
  }
}

export function Step1Blog() {
  const settings = useAppStore((s) => s.settings);
  const blogResult = useAppStore((s) => s.blogResult);
  const setBlogResult = useAppStore((s) => s.setBlogResult);
  const setProduct = useAppStore((s) => s.setProduct);
  const addSessionCost = useAppStore((s) => s.addSessionCost);

  const { text: streamedText, isStreaming, generate, cancel } = useTextGeneration();
  const paidConfirm = usePaidConfirm();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [features, setFeatures] = useState("");
  const [mainKeyword, setMainKeyword] = useState("");
  const [experience, setExperience] = useState<Experience | null>(null);
  const [experienceNotes, setExperienceNotes] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [lastError, setLastError] = useState<TextGenErrorInfo | null>(null);

  const canGenerate = Boolean(name.trim() && mainKeyword.trim() && experience);
  const busy = isStreaming || demoLoading;

  const buildProduct = (): Product => ({
    name: name.trim(),
    category: category.trim() || undefined,
    features: features.trim() || undefined,
    mainKeyword: mainKeyword.trim(),
    experience: experience as Experience,
    experienceNotes: experienceNotes.trim() || undefined,
  });

  const applyResult = (raw: string, provider: string, product: Product) => {
    const parsed = parseBlogOutput(raw);
    setProduct(product);
    setBlogResult({
      titles: parsed.titles,
      selectedTitle: parsed.titles[0] ?? "",
      bodyMarkdown: withDisclosure(parsed.body, settings.disclosureText),
      hashtags: parsed.hashtags,
      provider,
    });
  };

  const runGeneration = async () => {
    setLastError(null);
    const product = buildProduct();

    if (settings.demoMode) {
      setDemoLoading(true);
      await new Promise((r) => setTimeout(r, 500));
      applyResult(DEMO_BLOG_RAW, "데모", { ...DEMO_PRODUCT, ...product });
      setDemoLoading(false);
      return;
    }

    const system = buildBlogSystemPrompt(product);
    const user = buildBlogUserPrompt(product);

    const freeResult = await generate({
      task: "blog",
      system,
      user,
      grounding: true,
      providerOrder: ["gemini"],
      apiKeys: settings.apiKeys,
    });

    if (freeResult.ok) {
      applyResult(freeResult.text, freeResult.provider, product);
      return;
    }

    const proceed = await paidConfirm.requestConfirm(freeResult.error.message);
    if (!proceed) {
      setLastError(freeResult.error);
      return;
    }

    const paidResult = await generate({
      task: "blog",
      system,
      user,
      providerOrder: ["openai"],
      apiKeys: settings.apiKeys,
    });

    if (paidResult.ok) {
      addSessionCost(ROUGH_COST_WON.textGeneration);
      applyResult(paidResult.text, paidResult.provider, product);
    } else {
      setLastError(paidResult.error);
    }
  };

  const handleCopy = async () => {
    if (!blogResult) return;
    const html = markdownToSimpleHtml(blogResult.bodyMarkdown);
    await copyRichText(blogResult.bodyMarkdown, html);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">상품명 *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-rose-400"
            placeholder="예: 극세사 이불 세트"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">메인 키워드 *</span>
          <input
            value={mainKeyword}
            onChange={(e) => setMainKeyword(e.target.value)}
            disabled={busy}
            className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-rose-400"
            placeholder="예: 극세사 이불 추천"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">카테고리</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={busy}
            className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-rose-400"
            placeholder="예: 침구/이불"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">특징/설명</span>
          <input
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            disabled={busy}
            className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-rose-400"
            placeholder="예: 사계절용, 세탁기 세탁 가능"
          />
        </label>
      </div>

      <fieldset className="rounded-xl border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium text-gray-700">
          이 상품을 직접 써보셨나요? *
        </legend>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setExperience("experienced")}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
              experience === "experienced"
                ? "border-gray-900 bg-rose-500 text-white"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🍯 네, 직접 써봤어요
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setExperience("researched")}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
              experience === "researched"
                ? "border-gray-900 bg-rose-500 text-white"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🔍 아니요, 정보만 정리할게요
          </button>
        </div>

        {experience === "experienced" && (
          <textarea
            value={experienceNotes}
            onChange={(e) => setExperienceNotes(e.target.value)}
            disabled={busy}
            rows={4}
            placeholder={
              "메모하듯 편하게 적어주세요. 적지 않은 내용은 글에 등장하지 않아요.\n예) 언제·왜 샀는지 / 어떻게 썼는지 / 좋았던 순간 / 아쉬웠던 점"
            }
            className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rose-400"
          />
        )}
        {!experience && (
          <p className="mt-2 text-xs text-orange-500">선택해야 글을 생성할 수 있어요.</p>
        )}
      </fieldset>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canGenerate || busy}
          onClick={runGeneration}
          className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? "생성 중..." : "블로그 글 생성"}
        </button>
        {isStreaming && (
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <X size={14} /> 취소
          </button>
        )}
        {blogResult && (
          <button
            type="button"
            disabled={busy}
            onClick={runGeneration}
            className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> 글 다시 생성
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
          <p className="font-medium">글 생성에 실패했어요: {lastError.message}</p>
          <p className="mt-1 text-red-500">{errorHint(lastError)}</p>
          <button
            type="button"
            onClick={runGeneration}
            className="mt-2 rounded-xl border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      )}

      {blogResult && !isStreaming && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">결과</span>
            <ProviderBadge provider={blogResult.provider} />
          </div>

          {blogResult.titles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-500">제목 후보</span>
              {blogResult.titles.map((title) => (
                <label key={title} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="blog-title"
                    checked={blogResult.selectedTitle === title}
                    onChange={() => setBlogResult({ ...blogResult, selectedTitle: title })}
                  />
                  {title}
                </label>
              ))}
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-gray-500">본문 (직접 수정 가능)</span>
            <textarea
              value={blogResult.bodyMarkdown}
              onChange={(e) => setBlogResult({ ...blogResult, bodyMarkdown: e.target.value })}
              rows={14}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-rose-400"
            />
          </label>

          {blogResult.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {blogResult.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-medium text-white"
            >
              <Copy size={14} /> 복사
            </button>
          </div>
        </div>
      )}

      <CostConfirmModal
        open={paidConfirm.modalOpen}
        estimatedWon={ROUGH_COST_WON.textGeneration}
        failureReason={paidConfirm.failureReason}
        onCancel={paidConfirm.cancel}
        onConfirm={paidConfirm.confirm}
      />
    </div>
  );
}
