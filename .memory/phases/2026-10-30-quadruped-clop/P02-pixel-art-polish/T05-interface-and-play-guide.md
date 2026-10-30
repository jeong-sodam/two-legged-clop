# Task: T05 화면 흐름과 플레이 안내 정리

## Status: done

## Goal
모드 선택부터 준비, 플레이, 게임오버까지 화면 정보를 일관되게 정리하고 사이트 제목/접근성/README를 새 네발 기기 게임에 맞춘다.

## Decision Summary
- 모든 플레이 화면은 기존 960×540 Canvas 안에서 제공하되, 작은 화면에서도 비율을 유지하고 페이지 가로 넘침을 만들지 않는다.
- 키 배정표는 준비 10초 후 숨기고, 하단 팔다리 상태와 거리/개인 최고 기록은 플레이 중 유지한다.

## Implementation

### I01. 게임 화면과 캔버스 레이아웃

- Related Files:
  - `src/game.js` :: `drawHud`, `drawOverlay`, `render` — 정보 우선순위, 메뉴, 준비/결과 문구 통일; modify
  - `style.css` :: `.game-shell`, `#game`, `.keyboard-help`, `@media` — 데스크톱/작은 창 레이아웃; modify
  - `index.html` :: `<title>`, `<h1>`, `<canvas>`, `.keyboard-help` — 게임명, 접근성 문구, 고정 안내를 새 조작에 맞춤; modify

#### Details
- **Execution Flow / Logic**:
  1. ready 화면은 Normal/Hard 선택 강조, 선택 변경 키, 시작 키, 모드별 난이도 차이를 보여준다.
  2. memorize 화면은 4개 또는 8개 키 대응을 팔다리 이름과 들기/내리기 동사로 한눈에 짝짓고 남은 초를 표시한다.
  3. playing 화면은 거리 점수와 최고 기록, 현재 레벨/맵명, 하단의 네 팔다리 상태를 보여준다. 매핑 텍스트는 그리지 않는다.
  4. falling은 짧은 애니메이션을 방해하지 않는 효과음 없는 시각 연출로 처리한다. gameover는 현재 거리, 최고 거리, 모드와 모드 선택 복귀 안내를 보여준다.
  5. HUD 영역은 핵심 플레이어/머리 위험 시야를 가리지 않게 배치하고, 텍스트는 배경 패널 대비를 확보한다.
  6. CSS는 960:540 비율을 유지하고 `max-width:100vw` 및 반응형 높이를 적용한다. 모바일에서 페이지 바깥 가로 스크롤이 없어야 한다. 이번 범위는 키보드 게임이므로 터치 조작은 추가하지 않는다.
  7. `index.html` 제목과 접근 가능한 Canvas label 및 숨김 제목을 네발 기기 게임으로 바꾸고, 실제 조작이 바뀐 뒤에도 과거 점프/좌우 이동 안내를 노출하지 않는다.
  8. HTML 바깥의 기존 고정 키 안내에는 새 키를 하드코딩하지 않는다. 모드 선택 및 동적 키 안내는 Canvas 상태 화면을 따르며, 바깥 안내는 “키보드로 조작하는 네발 기기 게임” 같은 일반 안내만 둔다.

### I02. README 및 수동 플레이 안내

- Related Files:
  - `README.md` :: 게임 소개, Pages URL, 모드/조작/로컬 실행 안내 — 새 게임 정보로 교체; modify

#### Details
- README에는 현재 Pages 링크, 모드별 조작 규칙, 10초 준비 흐름, 랜덤 맵 및 머리 충돌 규칙, `python -m http.server 8000` 로컬 실행법을 한국어로 설명한다.
- 온라인 랭킹이 현재 없다는 사실을 정확히 설명하고, Azure 설정/비밀값/회사 로그인 안내를 추가하지 않는다.

## Acceptance Criteria
- [ ] 메뉴/준비/플레이/넘어짐/게임오버 상태마다 필요한 정보가 표시된다.
- [ ] 실제 플레이 중 키 대응 글자는 숨겨지고 팔다리 상태만 남는다.
- [ ] 제목, Canvas 접근성 이름, README가 네발 기기 게임과 일치한다.
- [ ] 좁은 브라우저 폭에서 캔버스가 화면에 맞고 가로 스크롤이 없다.
- [ ] Pages 링크와 로컬 서버 명령이 README에 남아 있다.

## Validation
- `node --check src/game.js` — UI 상태 렌더링 구문 검사 통과.
- `python -m http.server 8000` — 브라우저 폭을 960px 및 560px 이하로 바꿔 메뉴/준비/HUD/결과의 가독성, 키 숨김, 페이지 가로 넘침을 확인.
- 수동 플레이 — Normal/Hard 시작, 맵 선택, 머리 충돌 결과, 다시 모드 선택으로 돌아오는 흐름 확인.

## Commit Message
```text
feat(game): polish game screens and play instructions

Plan: 2026-10-30-quadruped-clop
Phase: P02-pixel-art-polish
Task: T05-interface-and-play-guide

- Polish mode, briefing, HUD, and game-over screens
- Update page metadata and responsive canvas styling
- Rewrite the README for the quadruped game
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`node --check`, 5개 화면 상태 렌더 smoke check, `git diff --check`)
- commit: `c1ae09b649c2b7daea2c20e651fd78ad12024db0`
