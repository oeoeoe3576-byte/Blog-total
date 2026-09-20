"use client";

import { useEffect, useState } from "react";
import { loadBlob } from "@/lib/storage";
import { getAudioDuration } from "@/lib/audio";

export interface DubbingAudioEntry {
  blob: Blob;
  durationSeconds: number;
}

/** sceneId -> blobKey 맵을 실제 Blob+길이 캐시로 로드한다. */
export function useDubbingAudioCache(keys: Record<string, string>): Record<string, DubbingAudioEntry> {
  const [cache, setCache] = useState<Record<string, DubbingAudioEntry>>({});
  const signature = Object.entries(keys)
    .map(([id, key]) => `${id}:${key}`)
    .join(",");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        Object.entries(keys).map(async ([sceneId, blobKey]) => {
          const blob = await loadBlob(blobKey);
          if (!blob) return null;
          const durationSeconds = await getAudioDuration(blob).catch(() => 0);
          return [sceneId, { blob, durationSeconds }] as const;
        }),
      );
      if (cancelled) return;

      const map: Record<string, DubbingAudioEntry> = {};
      for (const entry of entries) {
        if (entry) map[entry[0]] = entry[1];
      }
      setCache(map);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return cache;
}
