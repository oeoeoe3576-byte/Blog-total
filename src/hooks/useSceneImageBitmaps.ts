"use client";

import { useEffect, useState } from "react";
import { loadBlob } from "@/lib/storage";
import type { SceneImage } from "@/lib/types";

/** 사용 중인 장면 이미지들을 ImageBitmap으로 미리 디코딩해둔다(프레임마다 재사용, 규칙 9-2). */
export function useSceneImageBitmaps(sceneImages: SceneImage[]): Map<string, ImageBitmap> {
  const [bitmaps, setBitmaps] = useState<Map<string, ImageBitmap>>(new Map());
  // 영상 클립(mediaType: "video")은 useSceneVideoElements가 별도로 다루므로 여기서는 건너뛴다.
  const usedKeys = sceneImages.filter((img) => img.used && img.mediaType !== "video").map((img) => img.blobKey);
  const keysSignature = usedKeys.join(",");

  useEffect(() => {
    let cancelled = false;
    const localMap = new Map<string, ImageBitmap>();

    (async () => {
      for (const key of usedKeys) {
        const blob = await loadBlob(key);
        if (cancelled) return;
        if (!blob) continue;
        try {
          localMap.set(key, await createImageBitmap(blob));
        } catch {
          // 디코딩 실패한 이미지는 렌더러에서 그라데이션 폴백으로 대체된다.
        }
      }
      if (!cancelled) setBitmaps(localMap);
    })();

    return () => {
      cancelled = true;
      localMap.forEach((bitmap) => bitmap.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  return bitmaps;
}
