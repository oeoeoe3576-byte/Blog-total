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

- **Phase 5 — 영상 렌더링 엔진**: 완료
  - `lib/video/timeline.ts`: 더빙 유무에 따른 장면 길이 계산(오디오 길이+0.3초 또는
    글자수/5.5초), 내레이션 자막 청크 분할 — vitest 7건
  - `lib/video/textLayout.ts`: 캔버스 텍스트 줄바꿈(공백→글자 단위 폴백), `[[강조]]` 파싱 — vitest 4건
  - `lib/video/renderer.ts`: 미리보기와 녹화가 공유하는 `drawFrame()` 순수 함수.
    켄 번스 모션, 장면 전환 크로스페이드, 감성/시네마틱 톤, 이미지 디코딩 실패 시
    그라데이션 폴백(실제 e2e 테스트에서 감지된 "ImageBitmap detached" 예외를 잡아 처리)
  - `lib/video/recorder.ts`: Canvas.captureStream + WebAudio + MediaRecorder 합성,
    AudioContext.currentTime을 마스터 클록으로 사용해 싱크 유지, 취소(AbortSignal) 지원
    - **실제로 겪은 중요한 버그(Phase 6 검증 중 발견 후 여기서 함께 수정)**: 더빙이
      꺼져 있어 실제로 재생을 예약한 오디오 소스가 하나도 없을 때, 아무 소리도 나지
      않는 빈 `MediaStreamAudioDestinationNode` 트랙을 캔버스 스트림에 그대로 얹으면
      `MediaRecorder`가 녹화 시간 내내(수십 초) 단 한 번도 영상 데이터를 flush하지
      않고 최종적으로 0바이트 blob을 만드는 문제를 실제로 재현했다. 재생 시간·진행률·
      `<video>` 엘리먼트까지는 정상으로 보여서 겉으로는 성공한 것처럼 보였다.
      실제 오디오가 흐를 때(더빙 ON)는 문제가 없었다. 수정: 실제로 `start()`한 오디오
      소스가 하나라도 있을 때만 오디오 트랙을 붙이도록 바꿨다. 또한 캔버스를
      뷰포트 밖 멀리(`left: -99999px`)에 두면 일부 환경에서 페인트가 생략돼 프레임이
      아예 캡처되지 않는 문제도 있어, 뷰포트 안쪽에 두고 투명도로만 감추는 방식으로
      바꿨다. 마지막 안전장치로 녹화 결과가 0바이트면 조용히 성공 처리하지 않고
      명확한 오류를 던지도록 했다.
  - Step5Video UI: 실시간 미리보기, 클립 스타일/자막 스타일/더빙/해상도 설정,
    Web Speech 미리듣기, 탭 이탈 경고, 50초 초과 경고, 녹화 진행률/취소/다운로드
  - 데모 모드 더빙: 실제 TTS 없이 허밍 톤(WAV)을 생성해 오디오 길이 기반 싱크 로직을 검증
  - Playwright로 실제 브라우저에서 확인: 데모 모드로 더빙 ON 상태의 약 40초 영상을
    실제 녹화 시간(약 40.7초)만큼 걸려 완성 → 재생·다운로드 가능함을 확인. 렌더러 수정 전에는
    드물게 `ImageBitmap` detach로 인한 콘솔 예외가 있었는데, try/catch 폴백 추가 후 재현되지 않음을 확인

- **Phase 6 — 발행 패키지 + MP4 변환**: 완료
  - `lib/zip.ts`: jszip으로 `blog.txt`/`blog.html`/`threads.txt`/`script.txt`/`images/*`/
    `video.mp4|webm`/`credits.txt`를 묶어 ZIP 생성
  - `lib/video/ffmpeg.ts`: `@ffmpeg/ffmpeg` 싱글스레드 코어를 버튼 클릭 시에만 CDN에서
    지연 로드해 WebM→MP4 변환(진행률 콜백 포함)
  - `lib/scriptFormat.ts`: 대본 복사 포맷터를 Step3/Step6이 공유하도록 분리
  - Step6Package UI: 블로그/스레드/대본/이미지/영상 한 화면에 모아 개별 복사,
    전체 ZIP 다운로드, 네이버 자동 발행 API 부재 안내
  - **Phase 5에서 넘어온 것처럼 보였지만 Phase 6 검증(ZIP 안 영상 파일 실제 열어보기) 중에야
    발견한 버그**: ZIP에 담긴 `video.webm`의 길이가 0바이트였다. 위 Phase 5 항목에 적은
    "더빙 OFF일 때 빈 오디오 트랙을 섞으면 MediaRecorder가 아무 데이터도 flush하지 않는"
    문제였다. 수정 후 실제로 ZIP을 내려받아 압축을 풀고, 그 안의 `video.webm`을 별도
    브라우저 페이지에서 다시 열어 해상도(720×1280)와 재생 진행(`currentTime`이 실제로
    흐름)까지 직접 확인했다.

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
- Chrome이 `MediaRecorder`로 만든 WebM 파일의 `duration` 메타데이터를 즉시 계산하지 못해
  `<video>` 엘리먼트가 한동안 `Infinity`를 보고하는 경우가 있습니다(널리 알려진 Chrome/WebM
  자체의 한계이며 재생 자체는 끝까지 정상 동작합니다). 정확한 길이 표시가 꼭 필요하면
  Phase 6의 MP4 변환을 거치거나 별도의 duration-fix 라이브러리 적용을 검토하세요.
- `@ffmpeg/ffmpeg`(WebM→MP4 변환)는 코어 파일을 unpkg CDN(`@ffmpeg/core@0.12.10`)에서
  지연 로드합니다. 이 샌드박스는 unpkg/jsdelivr 등 CDN 접근이 막혀 있어 실제 변환 동작을
  끝까지 확인하지 못했습니다. 라이브러리 자체 API(`FFmpeg`, `toBlobURL`, `writeFile`,
  `exec`, `readFile`)는 설치된 패키지의 타입 선언으로 확인했으니 배포 환경에서 실제
  변환 버튼을 한 번 눌러 정상 동작하는지 확인해 주세요. 실패해도 WebM 그대로 다운로드할
  수 있게 만들어 뒀습니다.

## Phase 7에서 고친 버그

- **데모 이미지 캡션이 실제 영상 자막과 겹쳐 보이던 문제**: 데모 모드의 그라데이션
  placeholder 이미지(`generateDemoImageBlob`)가 장면 헤드라인 원본 텍스트(`[[강조]]`
  마크업 포함)를 이미지 가운데에 캡션으로 그려 넣고 있었는데, 실제 영상 렌더러도 같은
  자리에 마크업이 제거된 자막을 겹쳐 그리다 보니 마치 자막이 중복 렌더링되는 버그처럼
  보였다. 데모 이미지 캡션을 제거하고(실제 렌더러가 이미 자막을 그려주므로 중복이었음)
  구석에 작은 "데모 이미지" 워터마크만 남기도록 고쳤다. Playwright로 캔버스 미리보기를
  직접 스크린샷 찍어 눈으로 확인하는 과정에서 발견했다.
