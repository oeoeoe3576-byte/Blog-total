"use client";

import { useEffect, useState } from "react";
import { loadBlob } from "@/lib/storage";
import type { SceneImage } from "@/lib/types";

/**
 * 장면에 쓰이는 영상 클립(라이브 포토 등, mediaType: "video")을 미리 로드해 재생 준비된
 * <video> 엘리먼트로 캐싱해둔다. renderer가 매 프레임 drawImage(video, ...)로 그대로 그린다.
 */
export function useSceneVideoElements(sceneImages: SceneImage[]): Map<string, HTMLVideoElement> {
  const [videos, setVideos] = useState<Map<string, HTMLVideoElement>>(new Map());
  const usedKeys = sceneImages.filter((img) => img.used && img.mediaType === "video").map((img) => img.blobKey);
  const keysSignature = usedKeys.join(",");

  useEffect(() => {
    let cancelled = false;
    const localMap = new Map<string, HTMLVideoElement>();
    const objectUrls: string[] = [];

    (async () => {
      for (const key of usedKeys) {
        const blob = await loadBlob(key);
        if (cancelled) return;
        if (!blob) continue;
        try {
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          const video = document.createElement("video");
          video.src = url;
          video.muted = true;
          video.playsInline = true;
          video.loop = true;
          video.preload = "auto";
          await new Promise<void>((resolve, reject) => {
            video.onloadeddata = () => resolve();
            video.onerror = () => reject(new Error("영상 디코딩 실패"));
          });
          if (cancelled) return;
          localMap.set(key, video);
        } catch {
          // 디코딩 실패한 영상은 renderer에서 그라데이션 폴백으로 대체된다.
        }
      }
      if (!cancelled) setVideos(localMap);
    })();

    return () => {
      cancelled = true;
      localMap.forEach((video) => {
        video.pause();
        video.src = "";
      });
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  return videos;
}
