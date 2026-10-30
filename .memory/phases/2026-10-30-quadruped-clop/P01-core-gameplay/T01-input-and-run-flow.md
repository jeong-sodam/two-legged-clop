# Task: T01 모드 선택과 판 시작 흐름

## Status: done

## Goal
`Game`과 `Input`에 노말/하드 선택, 판마다 달라지는 키 배정, 10초 준비 상태를 추가해 사용자가 매 판 새 조작법을 익힌 뒤 플레이에 들어가게 한다.

## Decision Summary
- 노말은 팔다리별 키 하나를 누르는 동안 들어 올리고 놓으면 내린다. 하드는 팔다리별 들기/내리기 키 두 개로 자세를 바꾸며 키를 놓아도 자세가 유지된다.
- 매핑은 TKL의 인쇄 가능한 일반 키에서 모드별 4개/8개를 중복 없이 뽑고, 직전 판과 동일한 전체 배정은 제외한다. 매핑은 10초 준비 화면에만 표시한다.

## Implementation

### I00. 확정 요구사항과 전체 계획 참조

- Related Files:
  - `.memory/decisions/2026-10-30-quadruped-clop.md` :: 확정된 사용자 결정 전체; read-only, 첫 Task에 포함해 계획 이력 보존
  - `.memory/plans/2026-10-30-quadruped-clop.md` :: 전체 Phase/범위 및 실행 방식; read-only, 첫 Task에 포함해 계획 이력 보존
- 이 두 문서는 구현 중 수정하지 않는다. 본 Task의 코드 파일/청사진과 함께 첫 Task 커밋에 포함하여 결정과 계획이 저장소에 남도록 한다.

### I01. 입력 수집기와 동적 키 배정

- Related Files:
  - `src/input.js` :: `SUPPORTED_KEYS`, `Input` — 물리 키 이벤트와 현재 판의 키 매핑을 관리; modify

#### Details
- **Signatures & Types**:
  ```js
  export const CONTROL_KEYS = Object.freeze([
    // event.code values: KeyA..KeyZ, Digit0..Digit9,
    // Minus, Equal, BracketLeft, BracketRight, Backslash,
    // Semicolon, Quote, Backquote, Comma, Period, Slash
  ]);

  export function createControlMapping(mode, rng = Math.random, previous = null) {
    // mode: "normal" | "hard"
    // 반환: { leftArm: { raise: string, lower: string|null },
    //        rightArm: { raise: string, lower: string|null },
    //        leftLeg: { raise: string, lower: string|null },
    //        rightLeg: { raise: string, lower: string|null } }
  }

  export class Input {
    constructor(target = window);
    setControlMapping(mapping);
    isDown(code);
    consumePressed(code);
    consumeReleased(code);
    clear();
    destroy();
  }
  ```
- **Data & Schema Fields**:
  - `ControlMapping`: 네 키 코드(`leftArm`, `rightArm`, `leftLeg`, `rightLeg`) 각각에 `{ raise: string, lower: string|null }`를 둔다. Normal의 `lower`는 `null`; Hard는 8개 코드가 전부 달라야 한다.
  - `Input.down`, `Input.pressed`, `Input.released`: 각각 현재 눌린 키, 이번 프레임에 새로 눌린 키, 이번 프레임에 놓인 키의 `Set<string>`.
  - 저장 키 `quadrupedClopPreviousMapping`: 직전 매핑 JSON. 잘못된 JSON/스키마는 무시한다. 새 매핑은 직전 모드와 매핑을 비교하고 같으면 다시 뽑는다.
- **Execution Flow / Logic**:
  1. `keydown`/`keyup`에서 `event.code`를 사용하고, 매핑된 키에서 `ctrlKey`, `altKey`, `metaKey`가 없는 경우에만 브라우저 기본 동작을 막고 입력 상태를 갱신한다.
  2. 일반 후보는 영문 26자, 숫자 10자, 위 서명에 나열된 11개 문장부호 키다. 수정자, Enter/Space/Escape, 기능 키, 탐색 키는 후보에서 제외한다.
  3. Fisher–Yates 방식으로 후보를 섞는다. Normal은 4개, Hard는 8개를 뽑는다. 각 팔다리의 raise를 먼저 배정하고 Hard는 남은 키를 lower로 배정한다.
  4. 직전 저장값과 전체 `{mode, mapping}`이 같으면 다시 추첨한다. 입력 창 blur 시 모든 Set을 비운다.
  5. 같은 키의 반복 `keydown`은 새 `pressed` 이벤트로 중복 기록하지 않는다. `pressed`와 `released`는 `Game.update`에서 해당 동작을 소비한다.

### I02. 모드 메뉴 및 판 준비 상태

- Related Files:
  - `src/game.js` :: `Game.constructor`, `startRun`, `update`, `render`, `drawOverlay` — 선택/준비/플레이/게임오버 상태를 연결; modify

#### Details
- **Signatures & Types**:
  ```js
  // Game state union:
  // "ready" | "memorize" | "playing" | "falling" | "gameover"
  // Game.startRun(mode: "normal" | "hard"): void
  // Game.update(deltaSeconds: number): void
  // Game.loadPreviousMapping(): { mode: string, mapping: ControlMapping } | null
  // Game.savePreviousMapping(mode: string, mapping: ControlMapping): void
  ```
- **Data & Schema Fields**:
  - `Game.selectedMode`: `"normal" | "hard"`, 최초에는 `"normal"`.
  - `Game.mode`: 현재 판 모드 또는 아직 판이 없으면 `null`.
  - `Game.controlMapping`: 현재 판의 `ControlMapping`.
  - `Game.prepareSecondsRemaining`: 10에서 0까지 감소하는 초 단위 숫자.
  - `Game.state`: 위 5개 상태 문자열 중 하나.
- **Execution Flow / Logic**:
  1. `ready`에서 좌/우 화살표로 `selectedMode`를 Normal/Hard 사이에서 바꾸고 Enter/Space로 시작한다. 선택 직후 기본 Normal은 별도 키 없이 시작 가능하다.
  2. `startRun(mode)`은 새 판 상태를 초기화하고 매핑을 생성/저장한 다음 `state="memorize"`, `prepareSecondsRemaining=10`으로 둔다. 시작할 때 `input.clear()`로 메뉴의 Enter/Space/화살표 입력 잔여 상태를 비우고 새 매핑을 `input.setControlMapping(mapping)`에 전달한다. 준비 중에는 플레이어 이동과 장애물 생성을 진행하지 않는다.
  3. 저장된 직전 매핑과 현재 모드/매핑은 구조적으로 비교한다. JSON 객체 프로퍼티 순서에는 의존하지 않는다.
  4. `memorize` 동안 남은 초를 표시한다. `deltaSeconds`를 누적하고 10초가 되면 남은 시간을 0으로 고정하고 `state="playing"`으로 전환한다.
  5. `gameover`에서 Enter/Space를 누르면 새 판을 바로 시작하지 않고 `ready`로 돌아가 모드 선택을 받는다.
  6. localStorage 접근이 차단되거나 저장값이 손상되어도 새 무작위 매핑과 게임은 정상 동작한다.
- **UI & Keyboard Notes**:
  - ready 화면은 두 모드와 선택 중인 모드, 좌/우 선택 및 Enter/Space 안내를 표시한다.
  - memorize 화면은 네 팔다리 이름과 raise/lower 키를 읽을 수 있게 표시하고 10초 카운트다운을 보여준다.
  - 준비가 끝난 뒤 키 대응 글자는 렌더링하지 않는다. 팔다리 상태 표시 HUD는 T02에서 연결한다.

## Acceptance Criteria
- [ ] Normal에서 서로 다른 키 4개, Hard에서 서로 다른 키 8개가 생성된다.
- [ ] 준비 상태가 정확히 10초 유지되고, 그동안 이동/장애물이 시작되지 않는다.
- [ ] 다음 판은 직전 판과 같은 모드/키 전체 배정을 받지 않는다.
- [ ] 게임오버 후 모드 선택 화면으로 돌아간다.
- [ ] 브라우저 저장소를 쓸 수 없어도 메뉴와 플레이가 동작한다.

## Validation
- `node --check src/input.js` — 입력 모듈 구문 검사 통과.
- `node --check src/game.js` — 상태 및 렌더링 모듈 구문 검사 통과.
- `python -m http.server 8000` — 로컬 서버를 열어 모드 선택, 매핑 표시 10초, 준비 중 정지, 키 매핑 숨김을 브라우저에서 확인.

## Commit Message
```text
feat(game): add mode selection and randomized controls

Plan: 2026-10-30-quadruped-clop
Phase: P01-core-gameplay
Task: T01-input-and-run-flow

- Add normal and hard control mappings for TKL keyboards
- Add mode selection and a ten-second control briefing state
- Persist the previous mapping to prevent an identical consecutive assignment
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: b491cdb
