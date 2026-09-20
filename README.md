# 블로그 올인원 AI 에이전트

이 프로젝트의 전체 명세는 [`PROMPT.md`](./PROMPT.md)에 있습니다. Phase 단위로 진행 중입니다.

## 현재 진행 상황

- **Phase 0 — 뼈대**: 완료
  - Next.js(App Router) + TypeScript + Tailwind CSS 프로젝트 생성
  - 폰트: Pretendard(jsdelivr CDN), Google Fonts(Noto Sans KR, Black Han Sans, Do Hyeon, Gowun Dodum, Gowun Batang)
  - 스테퍼 + 6단계 카드 레이아웃
  - 설정 창(API 키 저장/삭제, 데모 모드, 유료 자동 허용 토글) — zustand persist로 localStorage에 저장
  - IndexedDB Blob 저장 래퍼(`src/lib/storage.ts`)
  - 프로바이더 공통 타입 + 무료→유료 체인 실행기 골격(`src/lib/providers/`)

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 빌드/검증

```bash
npm run build
npx tsc --noEmit
npm run lint
```

## 확인 필요 (Phase 1 이후 진행 전 재확인)

- Gemini/OpenAI 텍스트·이미지·TTS API의 정확한 엔드포인트, 파라미터, 응답 형식은 구현 직전 공식 문서로 재확인해야 합니다(PROMPT.md 0절, 5-4절).
- Pollinations/Hugging Face 무료 이미지 생성의 현재 이용 가능 여부.
- 이 개발 환경은 외부 네트워크 egress가 제한되어 있어 Pretendard/Google Fonts CDN 로딩을 로컬에서 직접 확인하지 못했습니다. Vercel 배포 환경에서는 정상 로드되는지 확인이 필요합니다.
