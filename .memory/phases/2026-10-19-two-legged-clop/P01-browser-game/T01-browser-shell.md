# 작업: T01 브라우저 게임 뼈대

## 상태: done

## 목표
외부 의존성 없이 브라우저에서 실행되고, 픽셀 비율에 맞춘 Canvas와 안정적인 애니메이션 루프를 제공하는 게임 뼈대를 만듭니다. 이후 작업이 사용할 파일과 인터페이스를 마련합니다.

## 결정 요약
- 기본 HTML, CSS, Canvas 2D와 ES 모듈을 사용합니다. 프레임워크, 패키지 관리자, 외부 에셋은 추가하지 않습니다.
- 논리 화면은 960x540으로 설정하고, 브라우저에서 16:9 비율과 선명한 픽셀을 유지하며 크기를 조절합니다.

## 구현 내용

### I01. 페이지, 스타일, 앱 시작 파일 작성
- 관련 파일:
  - `index.html` :: 게임 페이지와 Canvas 컨테이너; 신규
  - `style.css` :: 반응형 페이지, Canvas 크기, 픽셀 렌더링과 키보드 포커스 스타일; 신규
  - `src/main.js` :: 앱 시작 및 Canvas 연결; 신규
- 세부 사항:
  - `index.html`에 UTF-8, viewport 메타데이터, 문서 제목 `두 발 클롭`, `<main>` 안의 `<canvas id="game" width="960" height="540" aria-label="두 발 클롭 게임">`, 짧은 키보드 안내, `<script type="module" src="./src/main.js">`를 둡니다.
  - CSS는 어두운 배경, 화면 중앙 정렬, 최대 960 CSS 픽셀 너비를 적용합니다. Canvas 너비는 `min(100vw, 960px)`, 비율은 16:9, 픽셀 렌더링은 `image-rendering: pixelated`로 설정합니다. 가로 스크롤을 막고 좁은 화면에서 조작 안내가 줄바꿈되게 합니다.
  - `src/main.js`에서 Canvas 요소를 찾고 `CanvasRenderingContext2D`를 얻습니다. `imageSmoothingEnabled = false`로 설정한 뒤 `Game` 인스턴스를 만들고 `start()`를 호출합니다. 요소나 Context가 없으면 이유가 드러나는 오류를 발생시킵니다.

### I02. 게임 상태와 애니메이션 루프 정의
- 관련 파일:
  - `src/game.js` :: `Game` 클래스와 초기 렌더링; 신규
- 함수 서명과 타입:
  ```js
  export class Game {
    constructor(canvas, context) {}
    start(): void
    frame(timestamp: number): void
    update(deltaSeconds: number): void
    render(): void
  }
  ```
- 상태 필드:
  - `state`: 규약상 문자열 유니온 `'ready' | 'playing' | 'falling' | 'gameover'`; 초기값 `'ready'`.
  - `elapsedSeconds`: 숫자, 초기값 0.
  - `lastTimestamp`: 숫자 또는 null, 초기값 null.
  - `animationFrameId`: 숫자 또는 null, 초기값 null.
- 실행 흐름:
  1. `start()`는 이미 루프가 활성화되어 있으면 아무 작업도 하지 않습니다. 그렇지 않으면 `requestAnimationFrame` 콜백 하나를 예약합니다.
  2. `frame(timestamp)`는 프레임 간격을 초 단위로 계산합니다. 첫 프레임은 0, 이후 값은 `[0, 0.05]` 범위로 제한합니다. 갱신, 렌더링, 타임스탬프 저장 순서로 처리한 뒤 다음 프레임을 예약합니다.
  3. `update(deltaSeconds)`는 상태가 playing일 때만 `elapsedSeconds`를 증가시킵니다.
  4. `render()`는 논리 Canvas 전체를 지우고 단색 하늘, 지면 띠, 화면 중앙의 임시 사람 실루엣을 Canvas 도형으로 그립니다. 이후 작업에서 루프를 바꾸지 않고 그림만 교체할 수 있도록 렌더링은 `Game` 안에 둡니다.
- 오류 처리: Canvas Context를 만들지 못하면 브라우저 콘솔에 명확한 오류를 표시하고, 아무것도 그리지 않는 루프를 조용히 실행하지 않습니다.

## 완료 조건
- [x] 로컬 서버 화면 캡처에서 960x540 비율 Canvas가 선명하게 표시되는 것을 확인했습니다. 페이지가 렌더링되어 런타임 예외는 보이지 않습니다.
- [x] 코드 검토에서 단일 `requestAnimationFrame` 루프와 프레임 간격 제한을 확인했습니다.
- [x] 데스크톱 화면을 확인했고, 좁은 화면 대응 CSS와 줄바꿈 규칙을 확인했습니다.

## 검증
- `python -m http.server 8000`을 실행하고 `http://localhost:8000/`을 엽니다. Canvas, 배치, 브라우저 콘솔을 직접 확인합니다. (저장소 루트에서 실행)

## 커밋 메시지
```text
feat(game): 브라우저 Canvas 뼈대 추가

Plan: 2026-10-19-two-legged-clop
Phase: P01-browser-game
Task: T01-browser-shell

- 반응형 HTML 및 CSS 게임 화면을 추가
- 프레임 간격을 제한하는 Canvas 게임 루프를 추가
```

## 진행 상태
- [x] 구현 완료
- [x] 검증 통과
- 커밋: 이번 Task 커밋 예정

## 실행 기록
- `index.html`, `style.css`, `src/main.js`, `src/game.js`가 저장소의 초기 구현 커밋에 포함되어 있음을 확인했습니다.
- `node --check src/game.js`와 `node --check src/main.js`가 통과했습니다.
- 임시 Node HTTP 서버에서 `/`, `/style.css`, `/src/main.js`, `/src/game.js` 모두 HTTP 200과 기대한 Canvas, 픽셀 CSS, 모듈 연결, 애니메이션 루프 내용을 반환했습니다.
- 사용자가 제공한 Chrome 화면 캡처에서 Canvas 렌더링, 16:9 비율, 데스크톱 정렬과 키 안내를 확인했습니다. 페이지가 정상 실행되어 화면에 런타임 오류는 없었습니다.
- 좁은 화면 규칙은 CSS에서 Canvas의 유동 너비/고정 비율과 560px 이하 조작 안내 세로 배치로 확인했습니다.
- Python 실행기는 운영체제에서 실행이 차단되어 Node 서버로 대체했습니다. 자동화 브라우저는 GPU 초기화 실패로 실행되지 않았습니다.

