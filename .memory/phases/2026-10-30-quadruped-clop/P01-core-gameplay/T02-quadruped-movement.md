# Task: T02 네발 기기 조작과 플레이어 충돌

## Status: done

## Goal
기존 두 발 달리기 캐릭터와 자동 주행을 네 팔다리 독립 조작 캐릭터로 교체하고, 입력으로 얻는 전진감과 머리 충돌 게임오버를 만든다.

## Decision Summary
- 팔다리 순서는 강제하지 않으며 동시에 여러 키를 처리한다. 입력 리듬은 전진 속도와 흔들림에 영향을 주지만 흔들림이나 팔다리 자세만으로 실패하지 않는다.
- 머리 히트박스 충돌만 게임오버다. 몸통/팔다리 충돌은 T03의 장애물 효과로 전달한다.

## Implementation

### I01. 네발 캐릭터 데이터와 입력 기반 이동

- Related Files:
  - `src/game.js` :: `Game.startRun`, `update`, `updateLegs`(기존 심볼 교체), `updateMovement`, `updateBalance`, `drawPlayer`, `drawLeg` — 네발 자세, 조작, 전진과 넘어짐 상태 구현; modify
  - `src/input.js` :: `Input.isDown`, `Input.consumePressed`, `Input.consumeReleased` — T01 입력 API 사용; read-only

#### Details
- **Signatures & Types**:
  ```js
  // Player:
  // {
  //   x: number, y: number, forwardSpeed: number, bodyWobble: number,
  //   fallProgress: number,
  //   limbs: {
  //     leftArm: { raised: boolean, lift: number, swing: number },
  //     rightArm: { raised: boolean, lift: number, swing: number },
  //     leftLeg: { raised: boolean, lift: number, swing: number },
  //     rightLeg: { raised: boolean, lift: number, swing: number }
  //   }
  // }
  // Game.updateLimbs(deltaSeconds: number): void
  // Game.updateCrawlMovement(deltaSeconds: number): void
  // Game.getHeadHitbox(): { x: number, y: number, width: number, height: number }
  // Game.getBodyHitbox(): { x: number, y: number, width: number, height: number }
  // Game.getLimbHitboxes(): Array<{ limb: string, x: number, y: number, width: number, height: number }>
  // Game.beginFall(): void
  ```
- **Data & Schema Fields**:
  - 팔다리 `raised`는 논리 상태, `lift`는 0~1 애니메이션 보간값, `swing`은 사인 기반 보행 애니메이션 위상이다.
  - 캐릭터 전체와 각 팔다리 히트박스는 Canvas 월드 좌표의 `{x,y,width,height}` AABB로 표현한다.
  - 캔버스의 지면 y 기준은 기존 390px를 초기 기준으로 두고, 렌더러에서 맵 지면 정보를 전달할 수 있도록 상수화한다.
- **Execution Flow / Logic**:
  1. 각 팔다리 매핑을 순회한다. Normal에서는 `isDown(raise)`가 참일 때 raised, 아니면 내려간 상태로 둔다. Hard에서는 `consumePressed(raise/lower)`에 따라 상태를 바꾼다.
  2. 상태 변화 때 lift 애니메이션 목표를 1 또는 0으로 바꾸고, 매 프레임 제한된 속도로 보간한다. 키를 놓는 것은 Hard의 자세 상태를 바꾸지 않는다.
  3. 초기 조작 계수는 `LIFT_RATE=7.5/s`, `LOWER_RATE=9/s`, `CRAWL_IMPULSE=42 px/s`(각 실제 `false -> true` 전환), `CRAWL_DRAG=95 px/s²`, `MAX_CRAWL_SPEED=260 px/s` 상수로 둔다. 매 프레임 속도에 `-sign(forwardSpeed)*CRAWL_DRAG*dt`를 적용하되 0을 넘지 않게 감속하고, 새 들기 전환마다 impulse를 더한 뒤 최대 속도로 clamp한다.
  4. 좌우 들림 수 차이와 동시 들림 수로 `bodyWobble`을 계산하되 시각 범위 `[-0.18,+0.18]` rad로 clamp하고 실패 판정에 사용하지 않는다. `distance += forwardSpeed * deltaSeconds`이며 키 입력이 없으면 감속 후 거리 증가도 멈춘다.
  5. 준비/게임오버 상태에서는 이동 및 거리 갱신을 호출하지 않는다.
  6. 머리, 몸통, 각 팔다리 히트박스를 별도 계산한다. 머리 충돌이면 `beginFall()`로 `state="falling"`에 들어가고 0.65초간 팔이 접히고 몸이 앞으로 넘어지는 연출 후 `finishRun()`을 호출한다. 몸통/팔다리 자체는 여기서 게임오버를 만들지 않는다.
  7. `drawPlayer`는 머리, 몸통, 팔 2개, 다리 2개를 관절을 가진 사람 실루엣으로 그린다. 프레임 간 움직임은 정수 픽셀로 반올림한다.

### I02. 플레이 HUD와 점수 저장 연결

- Related Files:
  - `src/game.js` :: `loadBestScore`, `finishRun`, `drawHud`, `drawOverlay` — 거리 점수와 팔다리 상태를 표시; modify

#### Details
- **Data & Schema Fields**:
  - 저장 키 `quadrupedClopBestDistance`: 0 이상의 정수 거리 점수 문자열. 기존 `twoLeggedClopBestScore`는 장애물 보너스가 포함된 다른 점수 체계이므로 마이그레이션하지 않는다.
  - 화면 하단에 `leftArm`, `rightArm`, `leftLeg`, `rightLeg` 네 상태 칩을 고정 표시한다. 각 칩은 `들림`/`내려감`을 글자와 시각 상태(색 또는 아이콘) 둘 다로 표현한다.
- **Execution Flow / Logic**:
  1. 입력으로 발생한 크롤 전진 속도에 따라 월드 거리 `distance`가 증가하고, 점수는 그 정수부다. 키 입력이 없으면 전진 속도는 마찰로 0까지 감소하고 거리는 멈춘다. 장애물 회피 보너스와 통과 수는 점수에 더하지 않는다.
  2. `finishRun()`에서 개인 최고 거리보다 큰 경우에만 저장한다. JSON이 아니어도 되는 단일 정수 문자열로 읽고, 빈 값/음수/NaN은 0으로 처리한다.
  3. HUD는 게임 중 매 프레임 네 팔다리 상태를 갱신하며, 키 대응표는 절대 표시하지 않는다.
  4. Falling 상태에서는 접히는 팔을, gameover 상태에서는 점수/최고 거리와 모드 선택 복귀 안내를 보여준다.

## Acceptance Criteria
- [ ] 네 팔다리를 각각 독립적으로 들고 내릴 수 있고 여러 키를 동시에 처리한다.
- [ ] Normal의 누르고 있기/놓기 규칙과 Hard의 raise/lower 키 규칙이 구분된다.
- [ ] 입력 조합 및 몸 흔들림만으로 게임오버되지 않는다.
- [ ] 머리 충돌은 넘어짐 연출 후 게임오버를 만들고, 몸통 충돌은 게임오버가 아니다.
- [ ] 하단 상태 칩이 네 팔다리의 실제 상태를 항상 표시한다.
- [ ] 거리 점수와 브라우저 개인 최고 기록이 동작한다.

## Validation
- `node --check src/game.js` — 게임 모듈 구문 검사 통과.
- `python -m http.server 8000` — 로컬 브라우저에서 네 팔다리 개별/동시 입력, Normal/Hard 규칙, 머리/몸통 충돌, 점수 저장을 확인.

## Commit Message
```text
feat(game): implement quadruped crawling controls

Plan: 2026-10-30-quadruped-clop
Phase: P01-core-gameplay
Task: T02-quadruped-movement

- Replace runner movement with four independently controlled limbs
- Add crawl momentum, non-fatal body wobble, and head-only failure
- Track distance and persist the local best result
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: eacadd5
