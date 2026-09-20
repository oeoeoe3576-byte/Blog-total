// 서버가 사용자 입력 URL로 외부 요청을 대신 해주는 라우트(/api/fetch-product, /api/proxy-image)의
// SSRF 방어 로직 (오류 방지 규칙 10). 순수 함수 위주로 만들어 유닛 테스트가 쉽게 했다.

export interface UrlValidation {
  ok: boolean;
  url?: URL;
  reason?: string;
}

/** 사설/루프백/링크로컬 대역인지 리터럴 문자열 기준으로 판단한다(DNS 리바인딩은 다루지 않음). */
export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "::") return true;

  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  // IPv6 유니크 로컬(fc00::/7)/링크 로컬(fe80::/10)
  if (/^f[cd][0-9a-f]{0,2}:/.test(h) || h.startsWith("fe80:")) return true;

  return false;
}

export function validateExternalUrl(raw: string): UrlValidation {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "URL 형식이 올바르지 않아요." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "http/https 주소만 허용돼요." };
  }
  if (isBlockedHost(url.hostname)) {
    return { ok: false, reason: "내부망/사설 IP 주소는 요청할 수 없어요." };
  }
  return { ok: true, url };
}

export interface FetchSafelyOptions {
  maxRedirects?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * SSRF 방어가 적용된 fetch. 리다이렉트를 수동으로 따라가며 매 홉마다 재검증하고,
 * 사설 IP로 향하면 즉시 중단한다.
 */
export async function fetchSafely(rawUrl: string, options: FetchSafelyOptions = {}): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 3;
  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const validation = validateExternalUrl(current);
    if (!validation.ok || !validation.url) {
      throw new Error(validation.reason ?? "유효하지 않은 URL이에요.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

    let res: Response;
    try {
      res = await fetch(validation.url, {
        redirect: "manual",
        signal: controller.signal,
        headers: options.headers,
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("리다이렉트 대상 주소가 없어요.");
      current = new URL(location, validation.url).toString();
      continue;
    }

    return res;
  }

  throw new Error("리다이렉트가 너무 많아요.");
}
