"use client";

import { useEffect, useState } from "react";
import { loadBlob } from "@/lib/storage";

/** IndexedDB에 저장된 Blob을 object URL로 바꿔준다. 언마운트/키 변경 시 자동으로 해제한다. */
export function useBlobUrl(blobKey: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    // setState를 effect 본문에서 동기적으로 호출하지 않도록 항상 비동기 분기를 거친다.
    (async () => {
      const blob = blobKey ? await loadBlob(blobKey) : undefined;
      if (cancelled) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } else {
        setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobKey]);

  return url;
}
