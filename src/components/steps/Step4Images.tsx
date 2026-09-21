"use client";

import { useState } from "react";
import { Download, ImagePlus, Loader2, Pin, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useJsonGeneration } from "@/hooks/useJsonGeneration";
import { usePaidConfirm } from "@/hooks/usePaidConfirm";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useBlobUrl } from "@/hooks/useBlobUrl";
import { saveBlob } from "@/lib/storage";
import {
  blobToBase64,
  cropToAspect,
  fetchImageAsBlob,
  resizeForUpload,
  type Aspect,
} from "@/lib/imageUtils";
import { buildImagePromptsSystemPrompt, buildImagePromptsUserPrompt } from "@/lib/prompts/imagePrompts";
import { imagePromptsResponseSchema } from "@/lib/schemas";
import { stripHeadlineMarkup } from "@/lib/video/textLayout";
import { ROUGH_COST_WON } from "@/lib/cost";
import { runWithConcurrencyLimit } from "@/lib/concurrency";
import { CostConfirmModal } from "@/components/CostConfirmModal";
import { ProviderBadge } from "@/components/ProviderBadge";
import { generateDemoImageBlob } from "@/fixtures/demo";
import type { Scene, SceneImage, SceneImageSource } from "@/lib/types";
import type { ImageProviderId } from "@/lib/providers/image/meta";

const FREE_IMAGE_PROVIDERS: ImageProviderId[] = ["gemini", "pollinations", "huggingface"];
const REFERENCE_CAPABLE: ImageProviderId[] = ["gemini", "openai"];

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface StockResult {
  id: number;
  thumbnail: string;
  original: string;
  photographer: string;
}

export function Step4Images() {
  const settings = useAppStore((s) => s.settings);
  const scenes = useAppStore((s) => s.scenes);
  const productImageKeys = useAppStore((s) => s.productImageKeys);
  const addProductImageKey = useAppStore((s) => s.addProductImageKey);
  const removeProductImageKey = useAppStore((s) => s.removeProductImageKey);
  const imagePrompts = useAppStore((s) => s.imagePrompts);
  const setImagePrompt = useAppStore((s) => s.setImagePrompt);
  const sceneImages = useAppStore((s) => s.sceneImages);
  const addSceneImage = useAppStore((s) => s.addSceneImage);
  const removeSceneImage = useAppStore((s) => s.removeSceneImage);
  const setSceneImageUsed = useAppStore((s) => s.setSceneImageUsed);
  const addSessionCost = useAppStore((s) => s.addSessionCost);

  const promptGen = useJsonGeneration(imagePromptsResponseSchema);
  const paidConfirm = usePaidConfirm();
  const imageGen = useImageGeneration();

  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("low");
  const [productUrl, setProductUrl] = useState("");
  const [productFetchCandidates, setProductFetchCandidates] = useState<string[]>([]);
  const [productFetchLoading, setProductFetchLoading] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [generatingSceneIds, setGeneratingSceneIds] = useState<Set<string>>(new Set());
  const [failedSceneIds, setFailedSceneIds] = useState<Set<string>>(new Set());
  const [sourceTab, setSourceTab] = useState<Record<string, SceneImageSource>>({});

  if (!scenes || scenes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
        먼저 ③ 클립 쇼츠 기획 단계에서 대본을 만들어야 장면별 이미지를 준비할 수 있어요.
      </p>
    );
  }

  const markGenerating = (id: string, on: boolean) =>
    setGeneratingSceneIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const handlePinFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const resized = await resizeForUpload(file);
      const key = newId("product-img");
      const result = await saveBlob(key, resized);
      if (result.ok) addProductImageKey(key);
    }
  };

  const handleFetchProduct = async () => {
    if (!productUrl.trim()) return;
    setProductFetchLoading(true);
    setProductFetchCandidates([]);
    try {
      const res = await fetch("/api/fetch-product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: productUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error?.message ?? "상품 정보를 가져오지 못했어요.");
        return;
      }
      setProductFetchCandidates(json.imageUrls ?? []);
    } catch {
      alert("상품 정보를 가져오지 못했어요. 네트워크를 확인해 주세요.");
    } finally {
      setProductFetchLoading(false);
    }
  };

  const handlePinFetchedUrl = async (url: string) => {
    try {
      const blob = await fetchImageAsBlob(url);
      const resized = await resizeForUpload(blob);
      const key = newId("product-img");
      const result = await saveBlob(key, resized);
      if (result.ok) addProductImageKey(key);
    } catch {
      alert("이미지를 가져오지 못했어요.");
    }
  };

  const generatePrompts = async (targetScenes: Scene[] = scenes ?? []) => {
    if (targetScenes.length === 0) return true;
    setPromptsError(null);
    if (settings.demoMode) {
      for (const scene of targetScenes) {
        setImagePrompt(scene.id, {
          ko: `${scene.headline} 장면의 라이프스타일 사진`,
          en: `lifestyle photo depicting: ${scene.narration}`,
        });
      }
      return true;
    }

    const system = buildImagePromptsSystemPrompt();
    const user = buildImagePromptsUserPrompt(targetScenes);
    const attempt = (providerOrder: ("gemini" | "openai")[]) =>
      promptGen.generate({ task: "imagePrompts", system, user, providerOrder, apiKeys: settings.apiKeys });

    let result = await attempt(["gemini"]);
    if (!result.ok) {
      const proceed = await paidConfirm.requestConfirm();
      if (!proceed) {
        setPromptsError(result.error.message);
        return false;
      }
      result = await attempt(["openai"]);
      if (!result.ok) {
        setPromptsError(result.error.message);
        return false;
      }
      addSessionCost(ROUGH_COST_WON.textGeneration);
    }

    for (const p of result.data.prompts) {
      setImagePrompt(p.sceneId, { ko: p.ko, en: p.en });
    }
    return true;
  };

  const generateSceneImage = async (scene: Scene): Promise<boolean> => {
    markGenerating(scene.id, true);
    try {
      // AI 이미지 프롬프트가 아직 없으면(①번 버튼을 건너뛴 경우) 이미지 생성 전에 자동으로 만든다.
      // 프롬프트 없이 자막 원문([[ ]] 마크업이 섞인 한국어)을 그대로 이미지 모델에 넣으면 내용과
      // 무관한 이미지가 나오는 원인이 됐다.
      if (!useAppStore.getState().imagePrompts[scene.id]) {
        await generatePrompts([scene]);
      }
      const freshPrompt = useAppStore.getState().imagePrompts[scene.id];
      const promptEn = freshPrompt?.en || `Photo of ${stripHeadlineMarkup(scene.headline)}. ${scene.narration}`;

      if (settings.demoMode) {
        const blob = await generateDemoImageBlob(scene.headline, aspect);
        const key = newId("scene-img");
        await saveBlob(key, blob);
        addSceneImage({
          id: newId("img"),
          sceneId: scene.id,
          blobKey: key,
          provider: "데모",
          source: "ai",
          used: true,
        });
        return true;
      }

      let refImageBase64: string | undefined;
      if (productImageKeys[0]) {
        const { loadBlob } = await import("@/lib/storage");
        const productBlob = await loadBlob(productImageKeys[0]);
        if (productBlob) refImageBase64 = await blobToBase64(productBlob);
      }

      const attempt = (providerOrder: ImageProviderId[]) =>
        imageGen.generate({
          promptEn,
          aspect,
          quality,
          refImageBase64,
          providerOrder,
          apiKeys: settings.apiKeys,
        });

      let result = await attempt(FREE_IMAGE_PROVIDERS);
      if (!result.ok) {
        const proceed = await paidConfirm.requestConfirm();
        if (!proceed) {
          alert(`이미지 생성에 실패했어요: ${result.error.message}`);
          return false;
        }
        result = await attempt(["openai"]);
        if (!result.ok) {
          alert(`이미지 생성에 실패했어요: ${result.error.message}`);
          return false;
        }
        addSessionCost(ROUGH_COST_WON.imageGeneration);
      }

      const key = newId("scene-img");
      await saveBlob(key, result.blob);
      addSceneImage({
        id: newId("img"),
        sceneId: scene.id,
        blobKey: key,
        provider: result.provider,
        source: "ai",
        used: true,
      });

      if (refImageBase64 && !REFERENCE_CAPABLE.includes(result.provider as ImageProviderId)) {
        // 참조 이미지를 못 쓰는 프로바이더로 생성된 경우 상품 일관성 경고는 카드에서 표시한다.
      }

      return true;
    } catch {
      return false;
    } finally {
      markGenerating(scene.id, false);
    }
  };

  const handleGenerateAll = async () => {
    setFailedSceneIds(new Set());
    const targets = scenes.filter((s) => !sceneImages.some((img) => img.sceneId === s.id && img.used));
    const failed = new Set<string>();
    await runWithConcurrencyLimit(targets, 2, async (scene) => {
      const ok = await generateSceneImage(scene);
      if (!ok) failed.add(scene.id);
    });
    setFailedSceneIds(failed);
  };

  const handleRetryFailed = async () => {
    const targets = scenes.filter((s) => failedSceneIds.has(s.id));
    const failed = new Set<string>();
    await runWithConcurrencyLimit(targets, 2, async (scene) => {
      const ok = await generateSceneImage(scene);
      if (!ok) failed.add(scene.id);
    });
    setFailedSceneIds(failed);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-green-200 bg-green-50 p-3">
        <p className="mb-2 text-sm font-semibold text-green-800">📌 상품 이미지 고정</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="상품 링크 붙여넣기"
            className="min-w-[200px] flex-1 rounded-xl border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
          />
          <button
            type="button"
            onClick={handleFetchProduct}
            disabled={productFetchLoading}
            className="flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {productFetchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            가져오기
          </button>
          <label className="flex cursor-pointer items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Upload size={14} /> 파일 업로드
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePinFiles(e.target.files)}
            />
          </label>
        </div>
        <p className="mt-1 text-xs text-green-700">
          사이트가 차단하면 이미지 우클릭 → 주소 복사 또는 파일 업로드를 이용하세요.
        </p>

        {productFetchCandidates.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {productFetchCandidates.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => handlePinFetchedUrl(url)}
                className="overflow-hidden rounded-xl border border-gray-200 hover:border-gray-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-16 w-16 object-cover" />
              </button>
            ))}
          </div>
        )}

        {productImageKeys.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {productImageKeys.map((key) => (
              <PinnedThumb key={key} blobKey={key} onRemove={() => removeProductImageKey(key)} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 p-3">
        <select
          value={aspect}
          onChange={(e) => setAspect(e.target.value as Aspect)}
          className="rounded-xl border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="9:16">세로 9:16</option>
          <option value="16:9">가로 16:9</option>
          <option value="1:1">정사각 1:1</option>
        </select>
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")}
          className="rounded-xl border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="low">화질: low</option>
          <option value="medium">화질: medium</option>
          <option value="high">화질: high</option>
        </select>
        <button
          type="button"
          onClick={() => generatePrompts()}
          disabled={promptGen.isStreaming}
          className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          {promptGen.isStreaming && <Loader2 size={14} className="animate-spin" />}
          ① 프롬프트 생성
        </button>
        <button
          type="button"
          onClick={handleGenerateAll}
          disabled={generatingSceneIds.size > 0}
          className="flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          <ImagePlus size={14} /> ② 전체 이미지 생성
        </button>
        {failedSceneIds.size > 0 && (
          <button
            type="button"
            onClick={handleRetryFailed}
            className="flex items-center gap-1 rounded-xl border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <RefreshCw size={14} /> 실패한 것만 다시 생성 ({failedSceneIds.size})
          </button>
        )}
      </div>

      {promptsError && <p className="text-xs text-red-500">프롬프트 생성 실패: {promptsError}</p>}

      <div className="flex flex-col gap-3">
        {scenes.map((scene) => (
          <SceneImageCard
            key={scene.id}
            scene={scene}
            prompt={imagePrompts[scene.id]}
            onPromptChange={(entry) => setImagePrompt(scene.id, entry)}
            images={sceneImages.filter((img) => img.sceneId === scene.id)}
            isGenerating={generatingSceneIds.has(scene.id)}
            sourceTab={sourceTab[scene.id] ?? "ai"}
            onSourceTabChange={(tab) => setSourceTab((prev) => ({ ...prev, [scene.id]: tab }))}
            hasProductImage={productImageKeys.length > 0}
            productImageKey={productImageKeys[0]}
            apiKeys={settings.apiKeys}
            onGenerateAi={() => generateSceneImage(scene)}
            onUseProduct={async () => {
              if (!productImageKeys[0]) return;
              addSceneImage({
                id: newId("img"),
                sceneId: scene.id,
                blobKey: productImageKeys[0],
                provider: "product",
                source: "product",
                used: true,
              });
            }}
            onUploadFile={async (file) => {
              const isVideo = file.type.startsWith("video/");
              const key = newId("scene-img");
              if (isVideo) {
                // 라이브 포토(동영상)나 짧은 영상 클립은 리사이즈 없이 그대로 저장한다.
                // 최종 영상 렌더러가 이 블롭을 배경 영상으로 직접 재생한다.
                await saveBlob(key, file);
              } else {
                const resized = await resizeForUpload(file);
                await saveBlob(key, resized);
              }
              addSceneImage({
                id: newId("img"),
                sceneId: scene.id,
                blobKey: key,
                provider: "upload",
                source: "upload",
                used: true,
                mediaType: isVideo ? "video" : "image",
              });
            }}
            onPickStock={async (stock: StockResult) => {
              const blob = await fetchImageAsBlob(stock.original);
              const key = newId("scene-img");
              await saveBlob(key, blob);
              addSceneImage({
                id: newId("img"),
                sceneId: scene.id,
                blobKey: key,
                provider: "pexels",
                source: "stock",
                used: true,
                credit: stock.photographer,
              });
            }}
            onSelectImage={(imgId) => setSceneImageUsed(scene.id, imgId)}
            onRemoveImage={removeSceneImage}
          />
        ))}
      </div>

      <CostConfirmModal
        open={paidConfirm.modalOpen}
        estimatedWon={ROUGH_COST_WON.imageGeneration}
        onCancel={paidConfirm.cancel}
        onConfirm={paidConfirm.confirm}
      />
    </div>
  );
}

function PinnedThumb({ blobKey, onRemove }: { blobKey: string; onRemove: () => void }) {
  const url = useBlobUrl(blobKey);
  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-gray-200">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white"
        aria-label="상품 이미지 삭제"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}

interface SceneImageCardProps {
  scene: Scene;
  prompt?: { ko: string; en: string };
  onPromptChange: (entry: { ko: string; en: string }) => void;
  images: SceneImage[];
  isGenerating: boolean;
  sourceTab: SceneImageSource;
  onSourceTabChange: (tab: SceneImageSource) => void;
  hasProductImage: boolean;
  productImageKey?: string;
  apiKeys: { pexels?: string };
  onGenerateAi: () => void;
  onUseProduct: () => void;
  onUploadFile: (file: File) => void;
  onPickStock: (stock: StockResult) => void;
  onSelectImage: (imageId: string) => void;
  onRemoveImage: (imageId: string) => void;
}

const SOURCE_TABS: { id: SceneImageSource; label: string }[] = [
  { id: "product", label: "상품 사진 사용" },
  { id: "upload", label: "내 파일 업로드" },
  { id: "stock", label: "무료 스톡 검색" },
  { id: "ai", label: "AI 생성" },
];

function SceneImageCard({
  scene,
  prompt,
  onPromptChange,
  images,
  isGenerating,
  sourceTab,
  onSourceTabChange,
  hasProductImage,
  productImageKey,
  apiKeys,
  onGenerateAi,
  onUseProduct,
  onUploadFile,
  onPickStock,
  onSelectImage,
  onRemoveImage,
}: SceneImageCardProps) {
  const [stockQuery, setStockQuery] = useState(scene.headline);
  const [stockResults, setStockResults] = useState<StockResult[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const usedImage = images.find((img) => img.used);

  const searchStock = async () => {
    setStockLoading(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "content-type": "application/json", ...(apiKeys.pexels ? { "x-pexels-key": apiKeys.pexels } : {}) },
        body: JSON.stringify({ query: stockQuery }),
      });
      const json = await res.json();
      setStockResults(res.ok ? json.results : []);
    } finally {
      setStockLoading(false);
    }
  };

  const downloadCrop = async (targetAspect: Aspect, label: string) => {
    if (!usedImage) return;
    const { loadBlob } = await import("@/lib/storage");
    const blob = await loadBlob(usedImage.blobKey);
    if (!blob) return;
    const cropped = await cropToAspect(blob, targetAspect);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(cropped);
    a.download = `${scene.id}-${label}.jpg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="mb-2 text-sm font-semibold text-gray-700">
        📍 장면 ({scene.kind}) — {scene.headline}
      </p>

      {prompt && (
        <div className="mb-2 flex flex-col gap-1 rounded-xl bg-gray-50 p-2 text-xs">
          <textarea
            value={prompt.ko}
            onChange={(e) => onPromptChange({ ko: e.target.value, en: prompt.en })}
            rows={2}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs outline-none"
          />
          <div className="flex gap-2 text-gray-400">
            <button type="button" onClick={() => navigator.clipboard.writeText(prompt.ko)}>
              한국어 복사
            </button>
            <button type="button" onClick={() => navigator.clipboard.writeText(prompt.en)}>
              English 복사
            </button>
          </div>
        </div>
      )}

      <div className="mb-2 flex gap-1 rounded-xl bg-gray-100 p-1 text-xs">
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSourceTabChange(tab.id)}
            className={`flex-1 rounded-md px-2 py-1 font-medium ${
              sourceTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sourceTab === "product" && (
        <button
          type="button"
          disabled={!hasProductImage}
          onClick={onUseProduct}
          className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-30"
        >
          <Pin size={12} /> 이 상품 사진을 장면 이미지로 사용
        </button>
      )}

      {sourceTab === "upload" && (
        <div className="flex flex-col gap-1">
          <label className="flex w-fit cursor-pointer items-center gap-1 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Upload size={12} /> 파일 선택 (사진/영상)
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onUploadFile(e.target.files[0])}
            />
          </label>
          <p className="text-[11px] text-gray-400">
            아이폰 라이브 포토는 공유 시 &quot;라이브 포토로&quot;가 아닌 &quot;동영상으로&quot;를 선택해서 저장한 뒤 올려주세요.
          </p>
        </div>
      )}

      {sourceTab === "stock" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              className="flex-1 rounded-xl border border-gray-300 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={searchStock}
              disabled={stockLoading}
              className="rounded-xl bg-rose-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              검색
            </button>
          </div>
          {stockResults.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stockResults.map((r) => (
                <button key={r.id} type="button" onClick={() => onPickStock(r)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumbnail} alt="" className="h-14 w-14 rounded object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {sourceTab === "ai" && (
        <div className="flex items-center gap-2">
          {productImageKey && (
            <p className="text-xs text-orange-500">
              참조 미지원 프로바이더(Pollinations/HF)로 생성되면 상품 일관성이 낮을 수 있어요.
            </p>
          )}
          <button
            type="button"
            onClick={onGenerateAi}
            disabled={isGenerating}
            className="flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {isGenerating && <Loader2 size={12} className="animate-spin" />}
            이미지 생성
          </button>
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((img) => (
            <SceneImageThumb
              key={img.id}
              image={img}
              onSelect={() => onSelectImage(img.id)}
              onRemove={() => onRemoveImage(img.id)}
            />
          ))}
        </div>
      )}

      {usedImage && usedImage.mediaType === "video" && (
        <p className="mt-2 text-xs text-gray-400">
          영상 클립은 최종 영상에 그대로 배경으로 재생돼요. 블로그/스레드용 사진 자르기는 지원하지 않아요.
        </p>
      )}

      {usedImage && usedImage.mediaType !== "video" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ProviderBadge provider={usedImage.provider} />
          <button
            type="button"
            onClick={() => downloadCrop("16:9", "naver")}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
          >
            <Download size={12} /> 네이버 16:9
          </button>
          <button
            type="button"
            onClick={() => downloadCrop("9:16", "clip")}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
          >
            <Download size={12} /> 클립 9:16
          </button>
          <button
            type="button"
            onClick={() => downloadCrop("1:1", "threads")}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
          >
            <Download size={12} /> 스레드 1:1
          </button>
        </div>
      )}
    </div>
  );
}

function SceneImageThumb({
  image,
  onSelect,
  onRemove,
}: {
  image: SceneImage;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const url = useBlobUrl(image.blobKey);
  return (
    <div
      className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 ${
        image.used ? "border-gray-900" : "border-transparent"
      }`}
    >
      {url && image.mediaType === "video" ? (
        <video
          src={url}
          muted
          playsInline
          loop
          autoPlay
          className="h-full w-full cursor-pointer object-cover"
          onClick={onSelect}
        />
      ) : (
        url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full cursor-pointer object-cover" onClick={onSelect} />
        )
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white"
        aria-label="이미지 삭제"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}
