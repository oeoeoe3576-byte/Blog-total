"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useSceneImageBitmaps } from "@/hooks/useSceneImageBitmaps";
import { useDubbingAudioCache } from "@/hooks/useDubbingAudioCache";
import { useTtsGeneration } from "@/hooks/useTtsGeneration";
import { usePaidConfirm } from "@/hooks/usePaidConfirm";
import { saveBlob } from "@/lib/storage";
import { useBlobUrl } from "@/hooks/useBlobUrl";
import { runWithConcurrencyLimit } from "@/lib/concurrency";
import { ROUGH_COST_WON } from "@/lib/cost";
import { CostConfirmModal } from "@/components/CostConfirmModal";
import { buildTimeline, WARN_TOTAL_SECONDS } from "@/lib/video/timeline";
import { drawFrame, resolveStyle, RESOLUTION_SIZES, ensureFontsLoaded, type RenderSettings } from "@/lib/video/renderer";
import { recordVideo } from "@/lib/video/recorder";
import { generateDemoDubbingBlob } from "@/fixtures/demo";
import { VOICES_BY_PROVIDER, clampRate, type TtsProviderId } from "@/lib/providers/tts/meta";
import type { ClipStyle, Resolution, TextSize } from "@/lib/types";

const HEADLINE_FONTS = ["Black Han Sans", "Do Hyeon", "Gowun Dodum", "Gowun Batang", "Pretendard", "Noto Sans KR"];

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Step5Video({ active }: { active: boolean }) {
  const settings = useAppStore((s) => s.settings);
  const product = useAppStore((s) => s.product);
  const scenes = useAppStore((s) => s.scenes);
  const sceneImages = useAppStore((s) => s.sceneImages);
  const videoSettings = useAppStore((s) => s.videoSettings);
  const setVideoSettings = useAppStore((s) => s.setVideoSettings);
  const dubbingAudioKeys = useAppStore((s) => s.dubbingAudioKeys);
  const setDubbingAudioKey = useAppStore((s) => s.setDubbingAudioKey);
  const videoBlobKey = useAppStore((s) => s.videoBlobKey);
  const setVideoBlobKey = useAppStore((s) => s.setVideoBlobKey);
  const addSessionCost = useAppStore((s) => s.addSessionCost);

  const images = useSceneImageBitmaps(sceneImages);
  const dubbingCache = useDubbingAudioCache(dubbingAudioKeys);
  const ttsGen = useTtsGeneration();
  const paidConfirm = usePaidConfirm();

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRafRef = useRef<number | null>(null);

  const [dubbingLoading, setDubbingLoading] = useState(false);
  const [dubbingErrors, setDubbingErrors] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [tabHiddenWarning, setTabHiddenWarning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const existingVideoUrl = useBlobUrl(videoBlobKey);

  const resolvedStyle = resolveStyle(videoSettings.style, product?.experience === "experienced");

  const timeline = useMemo(() => {
    if (!scenes || scenes.length === 0) return null;
    return buildTimeline(
      scenes,
      (sceneId) => sceneImages.find((img) => img.sceneId === sceneId && img.used)?.blobKey,
      (sceneId) => dubbingCache[sceneId],
      videoSettings.dubbing,
    );
  }, [scenes, sceneImages, dubbingCache, videoSettings.dubbing]);

  const renderSettings: RenderSettings | null = useMemo(
    () => (timeline ? { ...videoSettings, style: resolvedStyle } : null),
    [timeline, videoSettings, resolvedStyle],
  );

  // 실시간 미리보기 루프(오디오 없이 반복 재생)
  useEffect(() => {
    if (!active || !timeline || !renderSettings || isRecording) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    ensureFontsLoaded().then(() => {
      if (cancelled) return;
      const start = performance.now();
      const loop = () => {
        if (cancelled) return;
        const elapsed = ((performance.now() - start) / 1000) % Math.max(timeline.totalDuration, 0.1);
        drawFrame(ctx, timeline, elapsed, renderSettings, images);
        previewRafRef.current = requestAnimationFrame(loop);
      };
      previewRafRef.current = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
    };
  }, [active, timeline, renderSettings, images, isRecording]);

  useEffect(() => {
    const onVisibility = () => setTabHiddenWarning(document.hidden && isRecording);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isRecording]);

  if (!scenes || scenes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
        먼저 ③ 클립 쇼츠 기획 단계에서 대본을 만들어야 영상을 만들 수 있어요.
      </p>
    );
  }

  const generateDubbing = async () => {
    setDubbingLoading(true);
    setDubbingErrors({});
    const errors: Record<string, string> = {};

    await runWithConcurrencyLimit(scenes, 2, async (scene) => {
      if (settings.demoMode) {
        const { blob } = generateDemoDubbingBlob(scene.narration.length);
        const key = newId("dub");
        await saveBlob(key, blob);
        setDubbingAudioKey(scene.id, key);
        return;
      }

      const attempt = (providerOrder: TtsProviderId[]) =>
        ttsGen.generate({
          text: scene.narration,
          voice: videoSettings.voice,
          rate: videoSettings.rate,
          providerOrder,
          apiKeys: settings.apiKeys,
        });

      let result = await attempt(["edge", "gemini"]);
      if (!result.ok) {
        const proceed = await paidConfirm.requestConfirm();
        if (!proceed) {
          errors[scene.id] = result.error.message;
          return;
        }
        result = await attempt(["openai"]);
        if (!result.ok) {
          errors[scene.id] = result.error.message;
          return;
        }
        addSessionCost(ROUGH_COST_WON.ttsGeneration);
      }

      const key = newId("dub");
      await saveBlob(key, result.blob);
      setDubbingAudioKey(scene.id, key);
    });

    setDubbingErrors(errors);
    setDubbingLoading(false);
  };

  const handleRecord = async () => {
    if (!timeline || !renderSettings) return;
    setRecordError(null);
    setIsRecording(true);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { blob } = await recordVideo({
        timeline,
        settings: renderSettings,
        images,
        resolution: videoSettings.resolution,
        signal: controller.signal,
        onProgress: (t, total) => setProgress(total > 0 ? t / total : 0),
      });
      const key = newId("video");
      await saveBlob(key, blob);
      setVideoBlobKey(key);
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : "영상 생성에 실패했어요.");
    } finally {
      setIsRecording(false);
      abortRef.current = null;
    }
  };

  const handleCancelRecord = () => {
    abortRef.current?.abort();
  };

  const previewNarration = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    scenes.forEach((scene) => {
      const utterance = new SpeechSynthesisUtterance(scene.narration);
      utterance.lang = "ko-KR";
      utterance.rate = clampRate(videoSettings.rate);
      window.speechSynthesis.speak(utterance);
    });
  };

  const resetStyleDefaults = () => {
    setVideoSettings({
      headline: { font: "Black Han Sans", size: "normal", color: "auto", background: "auto" },
      sub: { font: "Pretendard", size: "normal", color: "#ffffff", background: "auto" },
    });
  };

  const totalSeconds = timeline?.totalDuration ?? 0;
  const { width: previewW, height: previewH } = RESOLUTION_SIZES[videoSettings.resolution];

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <canvas
          ref={previewCanvasRef}
          width={previewW}
          height={previewH}
          className="w-[220px] rounded-xl border border-gray-300 bg-rose-500"
          style={{ aspectRatio: `${previewW} / ${previewH}` }}
        />
        <button
          type="button"
          onClick={handleRecord}
          disabled={isRecording}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {isRecording ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {isRecording ? "만드는 중..." : "🎬 클립 영상 만들기"}
        </button>

        {isRecording && (
          <div className="w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-rose-500 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={handleCancelRecord}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-gray-300 py-1 text-xs text-gray-600"
            >
              <Square size={12} /> 취소
            </button>
            <p className="mt-1 text-center text-[11px] text-gray-400">
              실제 재생 시간만큼 걸려요. 이 탭을 벗어나지 마세요.
            </p>
            {tabHiddenWarning && (
              <p className="mt-1 text-center text-[11px] font-medium text-orange-500">
                ⚠ 탭에서 벗어났어요! 녹화가 끊길 수 있어요.
              </p>
            )}
          </div>
        )}

        {recordError && <p className="text-xs text-red-500">{recordError}</p>}

        {existingVideoUrl && !isRecording && (
          <div className="w-full">
            <video src={existingVideoUrl} controls className="w-full rounded-xl" />
            <a
              href={existingVideoUrl}
              download="clip-video.webm"
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-gray-300 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={12} /> 다운로드
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">영상 제목</span>
          <input
            value={videoSettings.title}
            onChange={(e) => setVideoSettings({ title: e.target.value })}
            className="rounded-xl border border-gray-300 px-2 py-1.5 outline-none focus:border-rose-400"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">클립 스타일</span>
          <select
            value={videoSettings.style}
            onChange={(e) => setVideoSettings({ style: e.target.value as ClipStyle })}
            className="rounded-xl border border-gray-300 px-2 py-1.5"
          >
            <option value="auto">자동</option>
            <option value="emotional">감성</option>
            <option value="cinematic">시네마틱</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 p-2">
          <TextStyleFields
            label="가운데 큰 자막"
            value={videoSettings.headline}
            onChange={(patch) => setVideoSettings({ headline: { ...videoSettings.headline, ...patch } })}
          />
          <TextStyleFields
            label="아래 내레이션 자막"
            value={videoSettings.sub}
            onChange={(patch) => setVideoSettings({ sub: { ...videoSettings.sub, ...patch } })}
          />
          <button
            type="button"
            onClick={resetStyleDefaults}
            className="col-span-2 flex w-fit items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
          >
            <RotateCcw size={12} /> 둘 다 기본값으로
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-2">
          <label className="flex items-center justify-between text-xs font-medium text-gray-600">
            AI 더빙 넣기
            <input
              type="checkbox"
              checked={videoSettings.dubbing}
              onChange={(e) => setVideoSettings({ dubbing: e.target.checked })}
              className="h-4 w-4"
            />
          </label>

          {videoSettings.dubbing && (
            <>
              <div className="flex gap-2">
                <select
                  value={videoSettings.voice}
                  onChange={(e) => setVideoSettings({ voice: e.target.value })}
                  className="flex-1 rounded-xl border border-gray-300 px-2 py-1 text-xs"
                >
                  {VOICES_BY_PROVIDER.edge.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step={0.05}
                  min={0.9}
                  max={1.5}
                  value={videoSettings.rate}
                  onChange={(e) => setVideoSettings({ rate: clampRate(Number(e.target.value)) })}
                  className="w-16 rounded-xl border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                더빙을 켜면 각 장면 길이가 음성 길이에 맞춰 자동 조절돼요.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={generateDubbing}
                  disabled={dubbingLoading}
                  className="flex items-center gap-1 rounded-xl bg-rose-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
                >
                  {dubbingLoading && <Loader2 size={12} className="animate-spin" />}
                  더빙 생성
                </button>
                <button
                  type="button"
                  onClick={previewNarration}
                  className="flex items-center gap-1 rounded-xl border border-gray-300 px-2 py-1 text-xs text-gray-600"
                >
                  <Volume2 size={12} /> 미리듣기(영상엔 미포함)
                </button>
              </div>
              {Object.keys(dubbingErrors).length > 0 && (
                <p className="text-[11px] text-orange-500">
                  {Object.keys(dubbingErrors).length}개 장면은 더빙 생성에 실패해 무음으로 처리돼요.
                </p>
              )}
            </>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">해상도</span>
          <select
            value={videoSettings.resolution}
            onChange={(e) => setVideoSettings({ resolution: e.target.value as Resolution })}
            className="rounded-xl border border-gray-300 px-2 py-1.5"
          >
            <option value="720p">720p (빠름)</option>
            <option value="1080p">1080p</option>
          </select>
        </label>

        <p className="text-xs text-gray-400">
          훅·1번 장면은 점점 확대되는 시네마틱 모션이 자동 적용돼요. AI 영상 생성은 지원하지 않아요.
        </p>

        <p className={`text-xs ${totalSeconds > WARN_TOTAL_SECONDS ? "text-orange-500" : "text-gray-400"}`}>
          예상 길이: 약 {Math.round(totalSeconds)}초
          {totalSeconds > WARN_TOTAL_SECONDS && " — 50초를 넘었어요. 대본을 줄여보세요."}
        </p>
      </div>

      <CostConfirmModal
        open={paidConfirm.modalOpen}
        estimatedWon={ROUGH_COST_WON.ttsGeneration}
        onCancel={paidConfirm.cancel}
        onConfirm={paidConfirm.confirm}
      />
    </div>
  );
}

function TextStyleFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { font: string; size: TextSize; color: string; background: string };
  onChange: (patch: Partial<{ font: string; size: TextSize; color: string; background: string }>) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-gray-500">{label}</span>
      <select
        value={value.font}
        onChange={(e) => onChange({ font: e.target.value })}
        className="rounded-md border border-gray-300 px-1.5 py-1 text-xs"
      >
        {HEADLINE_FONTS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <select
        value={value.size}
        onChange={(e) => onChange({ size: e.target.value as TextSize })}
        className="rounded-md border border-gray-300 px-1.5 py-1 text-xs"
      >
        <option value="small">작게</option>
        <option value="normal">보통</option>
        <option value="large">크게</option>
      </select>
      <div className="flex gap-1">
        <select
          value={value.color === "auto" ? "auto" : "custom"}
          onChange={(e) => onChange({ color: e.target.value === "auto" ? "auto" : "#ffffff" })}
          className="flex-1 rounded-md border border-gray-300 px-1 py-1 text-xs"
        >
          <option value="auto">색상: 자동</option>
          <option value="custom">색상: 직접</option>
        </select>
        {value.color !== "auto" && (
          <input
            type="color"
            value={value.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-7 w-7 rounded"
          />
        )}
      </div>
      <select
        value={value.background}
        onChange={(e) => onChange({ background: e.target.value })}
        className="rounded-md border border-gray-300 px-1.5 py-1 text-xs"
      >
        <option value="auto">배경: 자동</option>
        <option value="none">배경: 없음</option>
      </select>
    </div>
  );
}
