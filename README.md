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

- **Phase 1 — 텍스트 파이프라인**: 완료
  - `/api/text`: Gemini(무료) → OpenAI(유료) 순서로 시도하는 스트리밍 텍스트 체인(순수 fetch, SDK 미사용)
  - `lib/parse.ts`: 구분자 기반 블로그 출력 파서 + vitest 단위 테스트 7건
  - `lib/prompts/`: 공통 규칙(경험 날조 금지, 프롬프트 인젝션 방어) + 블로그 프롬프트
  - 1단계(네이버 블로그 글) UI: 상품 정보 입력, 경험 여부 필수 선택, 스트리밍 미리보기,
    제목 후보 선택, 본문 직접 수정, 해시태그, HTML+텍스트 복사
  - 무료 실패 시 유료 확인 모달(예상 비용 표시, 세션 자동 허용 옵션)
  - 대가성 표기 문구를 코드에서 결정적으로 삽입(설정에서 문구 수정 가능)

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
npm run test
```

## 확인 필요 (다음 Phase 진행 전 재확인)

- Gemini/OpenAI 텍스트·이미지·TTS API의 정확한 엔드포인트, 파라미터, 응답 형식은 구현 직전 공식 문서로 재확인해야 합니다(PROMPT.md 0절, 5-4절).
  - Phase 1에서는 2026-09 기준 웹 검색으로 Gemini `streamGenerateContent`(x-goog-api-key, alt=sse)와
    OpenAI `/v1/chat/completions`(max_completion_tokens, response_format)를 확인해 반영했습니다.
    다만 이 환경은 `ai.google.dev`/`platform.openai.com` 등 공식 문서 도메인에 직접 접속이 막혀 있어
    검색 결과로만 교차 확인했습니다. 실제 키로 호출 전 공식 문서로 한 번 더 확인하는 것을 권장합니다.
  - 기본 모델: Gemini `gemini-2.5-flash`, OpenAI `gpt-5-mini` (설정에서 변경 가능하도록 구조는 열어뒀으나,
    Phase 1에는 UI에서 모델명을 바꾸는 입력창은 아직 없습니다 — 필요 시 Phase 2 이후에 추가).
- Pollinations/Hugging Face 무료 이미지 생성의 현재 이용 가능 여부(Phase 3에서 확인 예정).
- 이 개발 환경은 외부 네트워크 egress가 제한되어 있어 Pretendard/Google Fonts CDN 로딩을 로컬에서 직접 확인하지 못했습니다. Vercel 배포 환경에서는 정상 로드되는지 확인이 필요합니다.
