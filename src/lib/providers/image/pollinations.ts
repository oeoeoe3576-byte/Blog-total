// Pollinations 이미지 생성 어댑터. 키 없이 GET 한 번으로 이미지를 받는다.
// 참조 이미지(img2img)는 지원하지 않는다 — refImageBase64는 무시된다.

import type { ProviderAdapter } from "../types";
import { ProviderError } from "../types";
import { classifyHttpStatus } from "../httpError";
import { ASPECT_SIZES, IMAGE_PROVIDER_META } from "./meta";
import type { ImageGenInput } from "./types";

export const pollinationsImageAdapter: ProviderAdapter<ImageGenInput, Buffer> = {
  meta: IMAGE_PROVIDER_META.pollinations,

  isAvailable: () => true,

  run: async (input) => {
    const { width, height } = ASPECT_SIZES[input.aspect];
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(input.promptEn)}?width=${width}&height=${height}&nologo=true`;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    } catch {
      throw new ProviderError("NETWORK", "pollinations", "Pollinations에 연결할 수 없어요.");
    }

    if (!res.ok) {
      throw new ProviderError(
        classifyHttpStatus(res.status),
        "pollinations",
        `Pollinations 요청이 실패했어요 (HTTP ${res.status}).`,
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new ProviderError("BAD_RESPONSE", "pollinations", "이미지가 아닌 응답을 받았어요.");
    }

    return Buffer.from(await res.arrayBuffer());
  },
};
