// 이미지 리사이즈/크롭/변환 유틸. 전부 브라우저 Canvas 기반이라 클라이언트 컴포넌트에서만 호출한다.

export type Aspect = "9:16" | "16:9" | "1:1";

export const ASPECT_RATIO: Record<Aspect, number> = {
  "9:16": 9 / 16,
  "16:9": 16 / 9,
  "1:1": 1,
};

async function loadImageBitmapFromBlob(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

/** 업로드 이미지를 서버로 보내기 전 클라이언트에서 축소한다(Vercel 4.5MB 제한 대응, 규칙 2a). */
export async function resizeForUpload(
  file: Blob,
  maxLongSide = 1280,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await loadImageBitmapFromBlob(file);
  try {
    const scale = Math.min(1, maxLongSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 사용할 수 없어요.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했어요."))),
        "image/jpeg",
        quality,
      );
    });
  } finally {
    bitmap.close();
  }
}

/** cover 방식으로 지정한 비율에 맞게 자른다. focusX/focusY는 0~1(크롭 중심 위치). */
export async function cropToAspect(
  source: Blob,
  aspect: Aspect,
  focusX = 0.5,
  focusY = 0.5,
  outputLongSide = 1080,
): Promise<Blob> {
  const bitmap = await loadImageBitmapFromBlob(source);
  try {
    const ratio = ASPECT_RATIO[aspect];
    const outWidth = ratio >= 1 ? outputLongSide : Math.round(outputLongSide * ratio);
    const outHeight = ratio >= 1 ? Math.round(outputLongSide / ratio) : outputLongSide;

    const srcRatio = bitmap.width / bitmap.height;
    const targetRatio = outWidth / outHeight;

    let sx = 0;
    let sy = 0;
    let sw = bitmap.width;
    let sh = bitmap.height;

    if (srcRatio > targetRatio) {
      sw = bitmap.height * targetRatio;
      sx = (bitmap.width - sw) * focusX;
    } else {
      sh = bitmap.width / targetRatio;
      sy = (bitmap.height - sh) * focusY;
    }

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 사용할 수 없어요.");
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outWidth, outHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했어요."))),
        "image/jpeg",
        0.9,
      );
    });
  } finally {
    bitmap.close();
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mime = "image/jpeg"): Blob {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mime });
}

/** 외부 이미지 URL을 same-origin Blob으로 바꾼다(캔버스 오염 방지, 규칙 1). */
export async function fetchImageAsBlob(url: string): Promise<Blob> {
  const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("이미지를 가져오지 못했어요.");
  return res.blob();
}
