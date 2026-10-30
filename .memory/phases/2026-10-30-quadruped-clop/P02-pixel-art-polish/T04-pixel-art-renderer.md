# Task: T04 오리지널 픽셀 아트 렌더러

## Status: done

## Goal
임시 기하 도형 위주의 화면을 계층감과 애니메이션이 있는 오리지널 픽셀 아트 캐릭터/맵 렌더링으로 교체한다.

## Decision Summary
- Canvas 2D와 정수 좌표 기반 픽셀 아트를 유지한다. 게임플레이 코드와 시각 코드를 분리해 맵 및 캐릭터를 읽고 수정할 수 있게 한다.
- MapleStory 및 참고 게임의 원본 이미지/캐릭터/맵 배치를 복제하지 않고, 테마와 장애물 아이디어만 독립적으로 표현한다.

## Implementation

### I01. Canvas 렌더링 모듈 분리

- Related Files:
  - `src/renderer.js` :: `Renderer`, `drawBackground`, `drawPlayer`, `drawHazards`, `drawParallax` — 픽셀 아트 출력 모듈; new
  - `src/game.js` :: `Game.render`, 기존 `drawSky`, `drawHills`, `drawTree`, `drawGround`, `drawHazards`, `drawPlayer`, `drawLeg` — 렌더러에 상태 전달 및 중복 함수 제거; modify

#### Details
- **Signatures & Types**:
  ```js
  export class Renderer {
    constructor(canvas, context);
    render(snapshot);
    drawBackground(map, cameraOffset, elapsedSeconds);
    drawHazards(map, hazards, elapsedSeconds);
    drawPlayer(player, elapsedSeconds, state);
    drawParallax(map, cameraOffset);
  }
  // snapshot: {
  //   state: string, mode: "normal"|"hard"|null, map: MapDefinition|null,
  //   player: Player, hazards: Hazard[], score: number, bestScore: number,
  //   distance: number, elapsedSeconds: number, prepareSecondsRemaining: number,
  //   controlMapping: ControlMapping|null
  // }
  ```
- **Execution Flow / Logic**:
  1. `Game.render()`은 게임 데이터 snapshot을 만들어 `Renderer.render(snapshot)`에 넘긴다. renderer는 한 프레임마다 clear → 배경 먼 레이어 → 가까운 배경 → 지면 → 장애물 → 플레이어 순으로 그린다.
  2. 맵 ID에 따라 팔레트와 배경 구조가 달라진다: 이끼 숲의 나무/덩굴, 지하철 타일/기둥/열차, 공장 철골/기계, 옥상 건물/하늘, 야시장 천막/등불/빗물 반사.
  3. 수평 반복 배경은 월드 거리로 offset하며 정수 픽셀 좌표를 유지한다. 장면별 앞/중간/뒤 레이어의 속도를 달리해 원근감을 만든다.
  4. 플레이어는 머리, 몸통, 좌/우 팔, 좌/우 다리를 별도 모듈 함수로 그린다. lift/swing에 맞춰 관절을 회전/이동시키고, 머리 표정은 정상/불안/충돌 애니메이션 상태에 따라 바뀐다.
  5. 장애물은 각 타입의 실루엣과 색을 명확히 구분한다. 움직이는 위험물은 `age`를 사용해 흔들림/분출/투척 궤적을 표현한다. 충돌 예고 표시는 판정 영역과 같은 좌표를 가리킨다.
  6. `context.imageSmoothingEnabled=false`를 유지한다. 카메라 좌표와 렌더링 좌표가 달라도 hitbox 계산에는 영향을 주지 않는다.
- **Visual Constraints**:
  - 기존 960×540 가상 캔버스 비율 유지.
  - 어두운 배경에서도 캐릭터의 살색/옷/팔다리 구분과 위험 표식의 대비를 확보한다.
  - 모든 맵이 같은 장애물 위치와 같은 배경 색만 바꾸는 형태가 되지 않도록 배경 silhouette, 바닥 패턴, 장식, 위험물 실루엣을 테마별로 다르게 만든다.

## Acceptance Criteria
- [ ] 플레이어가 머리/몸통/네 팔다리가 구분되는 움직이는 사람 픽셀 캐릭터로 보인다.
- [ ] 다섯 맵의 원경, 중경, 지면 및 팔레트가 시각적으로 구분된다.
- [ ] 각 위험물의 애니메이션/예고가 실제 충돌 위치를 알려준다.
- [ ] 정수 픽셀 렌더링을 유지하고 게임 로직의 충돌 위치를 바꾸지 않는다.
- [ ] 코드나 이미지에 타 게임의 원본 아트가 포함되지 않는다.

## Validation
- `node --check src/renderer.js` — 렌더러 모듈 구문 검사 통과.
- `node --check src/game.js` — 렌더러 연결 모듈 구문 검사 통과.
- `python -m http.server 8000` — 브라우저에서 다섯 테마와 정상/넘어짐/위험물 애니메이션을 직접 확인하고, 캔버스 경계 밖 잘림이나 콘솔 오류가 없어야 함.

## Commit Message
```text
feat(game): draw original pixel art maps and character

Plan: 2026-10-30-quadruped-clop
Phase: P02-pixel-art-polish
Task: T04-pixel-art-renderer

- Extract Canvas rendering into a dedicated renderer
- Add layered pixel art for five original environments
- Animate the quadruped character and themed hazards
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`node --check`, 5개 맵/16개 장애물 렌더 smoke check, `git diff --check`)
- commit: `2c589884c711e70458274be2628a3c141461df01`
