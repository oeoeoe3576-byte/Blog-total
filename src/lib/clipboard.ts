// 마크다운 본문을 아주 단순한 HTML로 바꿔서 "서식이 있는 복사"를 지원한다.
// 완전한 마크다운 렌더러가 아니라, 네이버 블로그 붙여넣기에 자주 쓰이는
// 소제목(##)/굵게(**)만 최소한으로 처리한다.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function markdownToSimpleHtml(markdown: string): string {
  const paragraphs = markdown.split(/\n{2,}/);

  const html = paragraphs
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      if (trimmed.startsWith("## ")) {
        return `<h3>${escapeHtml(trimmed.slice(3))}</h3>`;
      }

      const withBold = escapeHtml(trimmed).replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>",
      );
      const withBreaks = withBold.replace(/\n/g, "<br />");
      return `<p>${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

/** ClipboardItem으로 HTML+텍스트를 함께 복사하고, 실패하면 일반 텍스트로 폴백한다. */
export async function copyRichText(plainText: string, html: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // 아래 폴백으로 진행
  }

  try {
    await navigator.clipboard.writeText(plainText);
    return true;
  } catch {
    return false;
  }
}
