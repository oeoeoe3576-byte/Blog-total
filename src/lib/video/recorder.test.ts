import { describe, expect, it } from "vitest";
import { pickSupportedMimeType } from "./recorder";

describe("pickSupportedMimeType", () => {
  it("MediaRecorder가 없는 환경(Node)에서도 예외 없이 null을 반환한다", () => {
    expect(() => pickSupportedMimeType()).not.toThrow();
    expect(pickSupportedMimeType()).toBeNull();
  });
});
