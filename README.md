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

- **Phase 2 — 스레드 + 클립 쇼츠 대본 기획**: 완료
  - 2단계(스레드): 메인+댓글 생성, 500자 제한 검증 및 초과 시 자동 재요청
  - 3단계(대본 기획): JSON 스키마(zod) 검증 + 실패 시 "JSON만 다시 출력" 1회 자동 재시도,
    [클립 대본 기획]/[글 붙여넣기]/[대본 복사] 탭, 장면 표 직접 편집, 예상 낭독 시간 표시
  - `usePaidConfirm`(무료 실패→유료 확인을 프라미스로 감싼 공용 훅)로 1~3단계 모두 동일한 방식 동작

- **Phase 3 — 이미지 파이프라인**: 완료
  - `lib/ssrf.ts` + `/api/proxy-image`, `/api/fetch-product`: SSRF 방어(사설 IP 차단,
    리다이렉트 매 홉 재검증) — 유닛 테스트 포함
  - `/api/image`: Gemini → Pollinations → Hugging Face(무료) → OpenAI(유료) 이미지 생성 체인,
    sharp로 4MB 이하 JPEG 보장
  - `/api/stock`: Pexels 검색
  - 4단계(이미지) UI: 상품 이미지 고정, 장면별 [상품 사진/업로드/스톡/AI] 소스 탭,
    프롬프트 생성/수정, 동시 2개 제한 일괄 생성, 비율별(16:9/9:16/1:1) 다운로드
  - 데모 모드는 캔버스 그라데이션 이미지로 API 호출 없이 전체 흐름 검증

- **Phase 4 — 더빙(TTS)**: 완료
  - `/api/tts`: Edge TTS(무료, 비공식) → Gemini TTS(무료) → OpenAI TTS(유료) 체인
  - `lib/wav.ts`: Gemini의 raw PCM(24kHz/16bit/mono) 응답에 WAV 헤더를 붙이는 순수 함수 + 유닛 테스트
  - `lib/audio.ts`: `<audio>` 엘리먼트로 오디오 길이 측정(사용자 제스처 불필요)
  - 클라이언트 훅(`useTtsGeneration`)에 30초 타임아웃 적용
  - Edge TTS는 이 샌드박스 환경에서 아웃바운드가 막혀 있어 항상 실패하지만, 그 실패가
    조용히 다음 프로바이더로 넘어가며 서버가 죽지 않는 것까지 실제로 확인함(정상 시나리오)

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
- Pollinations/Hugging Face 무료 이미지 생성: 2026-09 기준 웹 검색으로 Pollinations는 키 없이
  `image.pollinations.ai/prompt/...` GET 한 번으로, Hugging Face는 무료 월간 크레딧 한도 내에서
  `black-forest-labs/FLUX.1-schnell` 추론 API로 확인했습니다. 실제 무료 한도는 계정별로 다를 수 있어
  Hugging Face 토큰을 넣었는데 계속 실패한다면 무료 크레딧 소진 가능성을 의심해 보세요.
- OpenAI 이미지: `gpt-image-2` 모델은 `output_format`을 지원하지 않고 항상 base64로 응답합니다
  (서버에서 sharp로 항상 JPEG 재인코딩하므로 이 앱 동작에는 영향 없음). 403 응답 시 조직 인증
  (Organization Verification)이 필요할 수 있다는 안내를 함께 보여줍니다.
- OpenAI TTS(`gpt-4o-mini-tts`): `speed` 파라미터를 무시한다는 보고가 있어(2026-09 기준 알려진 이슈),
  유료 더빙의 말 속도 조절이 기대만큼 동작하지 않을 수 있습니다. Edge TTS는 SSML `rate`로 확실히 제어됩니다.
- Gemini TTS는 이 환경에서 실제 키로 호출해보지 못했습니다(egress 제한 + 테스트용 키 없음).
  PCM 포맷(24kHz/16bit/mono, 헤더 없음)은 문서 검색으로 교차 확인했고 `lib/wav.ts` 유닛 테스트로
  WAV 변환 로직 자체는 검증했지만, 실제 응답과의 end-to-end 확인은 남아 있습니다.
- Edge TTS(`msedge-tts`)는 이 샌드박스의 아웃바운드 제한으로 항상 403을 반환했습니다. 비공식 API라
  언제든 막힐 수 있다는 전제로 설계했고, 실패 시 다음 프로바이더로 넘어가는 동작은 실제로 확인했습니다.
- 이 개발 환경은 외부 네트워크 egress가 제한되어 있어 Pretendard/Google Fonts CDN 로딩을 로컬에서 직접 확인하지 못했습니다. Vercel 배포 환경에서는 정상 로드되는지 확인이 필요합니다.
