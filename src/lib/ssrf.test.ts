import { describe, expect, it } from "vitest";
import { isBlockedHost, validateExternalUrl } from "./ssrf";

describe("isBlockedHost", () => {
  it.each([
    "localhost",
    "127.0.0.1",
    "127.1.2.3",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "::1",
    "fe80::1",
  ])("사설/루프백 주소 %s 는 차단한다", (host) => {
    expect(isBlockedHost(host)).toBe(true);
  });

  it.each(["8.8.8.8", "example.com", "1.1.1.1", "172.32.0.1", "172.15.0.1"])(
    "공인 주소 %s 는 차단하지 않는다",
    (host) => {
      expect(isBlockedHost(host)).toBe(false);
    },
  );
});

describe("validateExternalUrl", () => {
  it("정상적인 https URL을 허용한다", () => {
    const result = validateExternalUrl("https://example.com/image.jpg");
    expect(result.ok).toBe(true);
  });

  it("http/https가 아닌 프로토콜은 거부한다", () => {
    expect(validateExternalUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateExternalUrl("ftp://example.com").ok).toBe(false);
  });

  it("localhost/사설 IP는 거부한다", () => {
    expect(validateExternalUrl("http://localhost:3000").ok).toBe(false);
    expect(validateExternalUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(validateExternalUrl("http://127.0.0.1").ok).toBe(false);
  });

  it("형식이 올바르지 않은 URL은 예외 없이 실패를 반환한다", () => {
    expect(() => validateExternalUrl("not a url")).not.toThrow();
    expect(validateExternalUrl("not a url").ok).toBe(false);
  });
});
