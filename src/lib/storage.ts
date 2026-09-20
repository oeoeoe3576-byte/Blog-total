// IndexedDB(Blob) 저장 래퍼 (PROMPT.md 오류 방지 규칙 4)
//
// 이미지/오디오/영상 Blob은 localStorage가 아니라 IndexedDB에 저장한다.
// 브라우저 환경에서만 동작하므로, 반드시 클라이언트 컴포넌트의
// useEffect/이벤트 핸들러 안에서 호출해야 한다.

import { del, get, set } from "idb-keyval";

export interface StorageError {
  kind: "QUOTA" | "UNKNOWN";
  message: string;
}

function toStorageError(err: unknown): StorageError {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "QuotaExceededError") {
    return {
      kind: "QUOTA",
      message: "저장 공간이 부족해요. 사용하지 않는 이미지/영상을 정리한 뒤 다시 시도해 주세요.",
    };
  }
  return {
    kind: "UNKNOWN",
    message: err instanceof Error ? err.message : "알 수 없는 저장 오류가 발생했어요.",
  };
}

export async function saveBlob(
  key: string,
  blob: Blob,
): Promise<{ ok: true } | { ok: false; error: StorageError }> {
  try {
    await set(key, blob);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toStorageError(err) };
  }
}

export async function loadBlob(key: string): Promise<Blob | undefined> {
  try {
    return await get<Blob>(key);
  } catch {
    return undefined;
  }
}

export async function deleteBlob(key: string): Promise<void> {
  try {
    await del(key);
  } catch {
    // 삭제 실패는 무시한다 — 앱 동작을 막지 않는다.
  }
}
