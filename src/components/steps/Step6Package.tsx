"use client";

import { useState } from "react";
import { Copy, FileArchive, Loader2, Video } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useBlobUrl } from "@/hooks/useBlobUrl";
import { loadBlob } from "@/lib/storage";
import { copyRichText, markdownToSimpleHtml } from "@/lib/clipboard";
import { formatSceneCopy } from "@/lib/scriptFormat";
import { buildPackageZip } from "@/lib/zip";
import { convertWebmToMp4 } from "@/lib/video/ffmpeg";

export function Step6Package() {
  const blogResult = useAppStore((s) => s.blogResult);
  const threadsResult = useAppStore((s) => s.threadsResult);
  const scenes = useAppStore((s) => s.scenes);
  const sceneImages = useAppStore((s) => s.sceneImages);
  const videoBlobKey = useAppStore((s) => s.videoBlobKey);
  const setVideoBlobKey = useAppStore((s) => s.setVideoBlobKey);

  const videoUrl = useBlobUrl(videoBlobKey);
  const [zipLoading, setZipLoading] = useState(false);
  const [mp4Loading, setMp4Loading] = useState(false);
  const [mp4Progress, setMp4Progress] = useState(0);
  const [mp4Error, setMp4Error] = useState<string | null>(null);

  const usedImages = sceneImages.filter((img) => img.used);
  const isMp4Already = videoBlobKey?.startsWith("video-mp4") ?? false;
  const isWebm = Boolean(videoUrl) && !isMp4Already;

  const scriptCopyText = scenes ? formatSceneCopy(scenes) : undefined;

  const handleCopyBlog = async () => {
    if (!blogResult) return;
    await copyRichText(blogResult.bodyMarkdown, markdownToSimpleHtml(blogResult.bodyMarkdown));
  };

  const handleCopyThreads = async () => {
    if (!threadsResult) return;
    const text = [threadsResult.main, ...threadsResult.replies].join("\n\n---\n\n");
    await copyRichText(text, `<pre>${text}</pre>`);
  };

  const handleCopyScript = async () => {
    if (!scriptCopyText) return;
    await copyRichText(scriptCopyText, `<pre>${scriptCopyText}</pre>`);
  };

  const handleConvertMp4 = async () => {
    if (!videoBlobKey) return;
    setMp4Error(null);
    setMp4Loading(true);
    setMp4Progress(0);
    try {
      const blob = await loadBlob(videoBlobKey);
      if (!blob) throw new Error("영상을 찾을 수 없어요.");
      const mp4Blob = await convertWebmToMp4(blob, setMp4Progress);
      const { saveBlob } = await import("@/lib/storage");
      const key = `video-mp4-${Date.now()}`;
      await saveBlob(key, mp4Blob);
      setVideoBlobKey(key);
    } catch (err) {
      setMp4Error(
        err instanceof Error
          ? `${err.message} WebM 파일 그대로 다운로드할 수 있어요.`
          : "MP4 변환에 실패했어요. WebM 파일 그대로 다운로드할 수 있어요.",
      );
    } finally {
      setMp4Loading(false);
    }
  };

  const handleDownloadZip = async () => {
    setZipLoading(true);
    try {
      const images = await Promise.all(
        usedImages.map(async (img, i) => {
          const blob = await loadBlob(img.blobKey);
          return blob ? { filename: `scene-${i + 1}-${img.source}.jpg`, blob } : null;
        }),
      );

      let video: { blob: Blob; filename: string } | undefined;
      if (videoBlobKey) {
        const blob = await loadBlob(videoBlobKey);
        if (blob) {
          const isMp4 = blob.type === "video/mp4";
          video = { blob, filename: isMp4 ? "video.mp4" : "video.webm" };
        }
      }

      const credits = usedImages
        .filter((img) => img.source === "stock" && img.credit)
        .map((img) => `Pexels - ${img.credit}`);

      const zipBlob = await buildPackageZip({
        blogBodyMarkdown: blogResult?.bodyMarkdown ?? "",
        threadsMain: threadsResult?.main,
        threadsReplies: threadsResult?.replies,
        scriptCopyText,
        images: images.filter((i): i is { filename: string; blob: Blob } => i !== null),
        video,
        credits,
      });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = "blog-package.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setZipLoading(false);
    }
  };

  if (!blogResult) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-500">
        먼저 ① 네이버 블로그 단계를 완료해야 발행 패키지를 만들 수 있어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-gray-200 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">블로그 글</span>
          <button type="button" onClick={handleCopyBlog} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
            <Copy size={12} /> 복사
          </button>
        </div>
        <p className="line-clamp-2 text-xs text-gray-500">{blogResult.selectedTitle || blogResult.titles[0]}</p>
      </div>

      {threadsResult && (
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">스레드 글</span>
            <button type="button" onClick={handleCopyThreads} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
              <Copy size={12} /> 복사
            </button>
          </div>
          <p className="line-clamp-2 text-xs text-gray-500">{threadsResult.main}</p>
        </div>
      )}

      {scriptCopyText && (
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">클립 대본</span>
            <button type="button" onClick={handleCopyScript} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
              <Copy size={12} /> 복사
            </button>
          </div>
          <p className="text-xs text-gray-500">{scenes?.length ?? 0}개 장면</p>
        </div>
      )}

      {usedImages.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-3">
          <span className="text-sm font-semibold text-gray-700">이미지 {usedImages.length}장</span>
        </div>
      )}

      {videoUrl && (
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              <Video size={14} /> 클립 영상
            </span>
            {isWebm && (
              <button
                type="button"
                onClick={handleConvertMp4}
                disabled={mp4Loading}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-40"
              >
                {mp4Loading && <Loader2 size={12} className="animate-spin" />}
                MP4로 변환 {mp4Loading && `(${Math.round(mp4Progress * 100)}%)`}
              </button>
            )}
          </div>
          <video src={videoUrl} controls className="w-full max-w-[220px] rounded-lg" />
          {mp4Error && <p className="mt-1 text-xs text-orange-500">{mp4Error}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={handleDownloadZip}
        disabled={zipLoading}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {zipLoading ? <Loader2 size={14} className="animate-spin" /> : <FileArchive size={14} />}
        {zipLoading ? "압축 중..." : "전체 ZIP 다운로드"}
      </button>

      <p className="text-xs text-gray-400">
        네이버 블로그 자동 발행 API는 없어요. 각 글을 복사해서 붙여넣어 주세요.
      </p>
    </div>
  );
}
