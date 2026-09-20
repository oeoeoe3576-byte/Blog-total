/* eslint-disable @next/next/no-page-custom-font -- App Router 루트 레이아웃에서 React 19의
   <link rel="stylesheet"> 호이스팅 방식으로 전역 폰트를 로드한다(Pretendard/Google Fonts CDN). */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "블로그 올인원 AI 에이전트",
  description:
    "상품 정보 하나로 블로그 글, 스레드, 쇼츠 대본, 이미지, 영상까지 한 번에 만드는 콘텐츠 에이전트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
