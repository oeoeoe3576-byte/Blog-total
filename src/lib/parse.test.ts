import { describe, expect, it } from "vitest";
import { parseBlogOutput } from "./parse";

describe("parseBlogOutput", () => {
  it("정상적인 구분자 형식을 파싱한다", () => {
    const raw = `
===TITLES===
1) 첫 번째 제목
2) 두 번째 제목
===BODY===
## 소제목 1
본문 내용입니다. [이미지1: 제품 사진]
===TAGS===
#태그1 #태그2 #태그3
`.trim();

    const result = parseBlogOutput(raw);
    expect(result.titles).toEqual(["첫 번째 제목", "두 번째 제목"]);
    expect(result.body).toContain("## 소제목 1");
    expect(result.body).toContain("[이미지1: 제품 사진]");
    expect(result.hashtags).toEqual(["#태그1", "#태그2", "#태그3"]);
  });

  it("코드펜스로 감싸진 응답도 파싱한다", () => {
    const raw = "```\n===TITLES===\n1) 제목\n===BODY===\n본문\n===TAGS===\n#태그\n```";
    const result = parseBlogOutput(raw);
    expect(result.titles).toEqual(["제목"]);
    expect(result.body).toBe("본문");
    expect(result.hashtags).toEqual(["#태그"]);
  });

  it("구분자 앞에 잡문이 섞여 있어도 파싱한다", () => {
    const raw = `물론이죠! 요청하신 블로그 글이에요.\n\n===TITLES===\n1) 제목\n===BODY===\n본문 내용\n===TAGS===\n#태그`;
    const result = parseBlogOutput(raw);
    expect(result.titles).toEqual(["제목"]);
    expect(result.body).toBe("본문 내용");
  });

  it("구분자가 전혀 없으면 죽지 않고 전체를 본문으로 반환한다", () => {
    const raw = "그냥 아무 형식 없는 텍스트입니다. 구분자가 하나도 없어요.";
    const result = parseBlogOutput(raw);
    expect(result.titles).toEqual([]);
    expect(result.hashtags).toEqual([]);
    expect(result.body).toBe(raw);
  });

  it("TAGS 구분자가 없으면 본문이 끝까지 이어지고 태그는 빈 배열이다", () => {
    const raw = "===TITLES===\n1) 제목\n===BODY===\n본문이 끝까지 이어집니다.";
    const result = parseBlogOutput(raw);
    expect(result.body).toBe("본문이 끝까지 이어집니다.");
    expect(result.hashtags).toEqual([]);
  });

  it("TITLES 구분자가 없으면 제목은 빈 배열이고 본문은 정상 파싱된다", () => {
    const raw = "===BODY===\n본문만 있어요\n===TAGS===\n#태그1";
    const result = parseBlogOutput(raw);
    expect(result.titles).toEqual([]);
    expect(result.body).toBe("본문만 있어요");
    expect(result.hashtags).toEqual(["#태그1"]);
  });

  it("빈 문자열이 들어와도 예외 없이 처리한다", () => {
    expect(() => parseBlogOutput("")).not.toThrow();
    const result = parseBlogOutput("");
    expect(result).toEqual({ titles: [], body: "", hashtags: [] });
  });
});
