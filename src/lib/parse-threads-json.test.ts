import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseThreadsOutput, parseJsonLenient } from "./parse";

describe("parseThreadsOutput", () => {
  it("메인+댓글 3개를 파싱한다", () => {
    const raw = `===MAIN===\n메인 내용\n===REPLY===\n댓글1\n===REPLY===\n댓글2\n===REPLY===\n댓글3`;
    const result = parseThreadsOutput(raw);
    expect(result.main).toBe("메인 내용");
    expect(result.replies).toEqual(["댓글1", "댓글2", "댓글3"]);
  });

  it("댓글이 없어도 죽지 않는다", () => {
    const raw = `===MAIN===\n메인만 있어요`;
    const result = parseThreadsOutput(raw);
    expect(result.main).toBe("메인만 있어요");
    expect(result.replies).toEqual([]);
  });

  it("구분자가 없으면 전체를 메인으로 취급한다", () => {
    const raw = "구분자 없는 그냥 텍스트";
    const result = parseThreadsOutput(raw);
    expect(result.main).toBe(raw);
    expect(result.replies).toEqual([]);
  });
});

describe("parseJsonLenient", () => {
  const schema = z.object({ scenes: z.array(z.object({ headline: z.string() })).min(1) });

  it("정상 JSON을 파싱한다", () => {
    const result = parseJsonLenient('{"scenes":[{"headline":"a"}]}', schema);
    expect(result.ok).toBe(true);
  });

  it("코드펜스+잡문이 섞인 JSON도 파싱한다", () => {
    const raw = '물론이죠!\n```json\n{"scenes":[{"headline":"a"}]}\n```';
    const result = parseJsonLenient(raw, schema);
    expect(result.ok).toBe(true);
  });

  it("잘못된 JSON은 ok:false를 반환하고 예외를 던지지 않는다", () => {
    expect(() => parseJsonLenient("이것은 JSON이 아닙니다", schema)).not.toThrow();
    const result = parseJsonLenient("이것은 JSON이 아닙니다", schema);
    expect(result.ok).toBe(false);
  });

  it("스키마와 맞지 않는 JSON은 ok:false를 반환한다", () => {
    const result = parseJsonLenient('{"scenes":[]}', schema);
    expect(result.ok).toBe(false);
  });
});
