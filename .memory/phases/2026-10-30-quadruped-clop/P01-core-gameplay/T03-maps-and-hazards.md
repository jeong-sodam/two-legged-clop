# Task: T03 무작위 맵과 장애물 상호작용

## Status: done

## Goal
다섯 테마 중 판마다 하나를 골라 유지하고, 맵별 장애물과 몸에 주는 효과 및 거리 기반 난이도를 추가한다.

## Decision Summary
- 한 판에는 이끼 숲, 지하철 플랫폼, 버려진 공장, 바람 부는 옥상, 비 내리는 야시장 중 맵 하나만 나온다.
- 어떤 장애물이든 머리 충돌만 게임오버다. 다른 부위 접촉은 장애물 설정에 따라 밀림/감속/미끄러짐을 줄 수 있다.

## Implementation

### I01. 맵 및 장애물 모델

- Related Files:
  - `src/obstacles.js` :: `HAZARD_TYPES`, `difficultyForScore`, `createHazard`, `intersects` — 테마, 위험물 속성, 충돌 계산; modify
  - `src/game.js` :: `Game.startRun`, `spawnHazard`, `updateCourse` — 맵 선택, 생성, 충돌 효과 적용; modify

#### Details
- **Signatures & Types**:
  ```js
  export const MAPS = Object.freeze([
    { id: "moss-forest", name: "이끼 숲", hazardTypes: ["slippery-log", "monkey-banana", "ground-spear", "knockback-snake"] },
    { id: "subway", name: "지하철 플랫폼", hazardTypes: ["commuter", "train-edge", "turnstile"] },
    { id: "factory", name: "버려진 공장", hazardTypes: ["conveyor", "piston", "rolling-gear"] },
    { id: "windy-rooftop", name: "바람 부는 옥상", hazardTypes: ["gust", "swinging-sign", "low-wire"] },
    { id: "night-market", name: "비 내리는 야시장", hazardTypes: ["puddle", "cart", "steam-vent"] },
  ]);

  export function difficultyForDistance(distance, mode);
  export function createHazard(type, x, groundY, rng = Math.random);
  export function intersects(a, b);
  ```
- **Data & Schema Fields**:
  - `MAPS` 각 항목: `{id:string,name:string,hazardTypes:string[]}`.
  - Hazard: `{id:number,type:string,x:number,y:number,width:number,height:number,vx:number,age:number,warningDuration:number,bounds:Rect,effect:"none"|"knockback"|"slow"|"slip",resolved:boolean,passed:boolean}`. `Rect={x:number,y:number,width:number,height:number}`. Head/body/limb hitboxes belong to `Game` player helpers in T02.
  - Difficulty return: `{level:number,movingHazardSpeed:number,minGap:number,maxGap:number}`.
- **Execution Flow / Logic**:
  1. `startRun`에서 5개 `MAPS` 중 하나를 균등 무작위로 골라 `Game.map`에 저장하고 해당 판 동안 바꾸지 않는다.
  2. `spawnHazard()`는 현재 맵의 `hazardTypes` 중 하나를 무작위로 선택한다. 맵이 선택되기 전에는 생성하지 않는다. 다음 위험물은 무작위 월드 거리 간격(minGap~maxGap) 뒤에 놓는다. 기어/간판/열차/투척물 등 독립적으로 움직이는 위험물의 속도만 난이도 `movingHazardSpeed`를 사용한다. 플레이어의 크롤 거리와 속도는 T02가 직접 제어한다.
  3. 다섯 테마의 대표 상호작용을 유지한다: 이끼 통나무는 미끄러짐, 원숭이 바나나는 포물/흔들림 투척, 바닥 창은 짧은 예고 후 상승, 뱀은 접촉 시 뒤로 밀기; 지하철 군중은 밀기, 열차 가장자리는 머리 위험, 개찰구는 낮은 장애물; 공장 컨베이어는 속도 변화, 피스톤은 예고 후 왕복, 기어는 굴러감; 옥상 돌풍은 몸을 밀기, 간판은 흔들림, 낮은 전선은 머리 위험; 야시장 웅덩이는 미끄러짐, 수레는 밀기, 증기구는 예고 후 분출.
  4. 충돌 검사는 장애물 `bounds`와 캐릭터 `getHeadHitbox()`를 먼저 비교한다. 교차하면 T02의 `beginFall()`만 호출한다. 머리가 안전하고 `getBodyHitbox()` 또는 `getLimbHitboxes()` 중 하나만 교차한 경우 해당 장애물의 `effect`를 한 번만 적용한다.
  5. 장애물별 `resolved`로 동일 장애물에서 프레임마다 효과가 중첩되지 않게 한다. `passed`는 제거/통계용이며 점수 보너스를 주지 않는다.
  6. `difficultyForDistance(distance, mode)`는 `level=min(8,floor(max(0,distance)/300))`으로 계산한다. Normal은 `movingHazardSpeed=70+12*level`, gap 범위 `[360-20*level, 500-20*level]`; Hard는 `movingHazardSpeed=100+14*level`, gap 범위 `[280-15*level, 390-15*level]`이다. 최소 간격은 Normal 200, Hard 160으로 clamp한다. 따라서 거리가 증가할수록 동적 위험물이 빨라지고 등장 간격이 짧아진다. 정의되지 않은 mode/map/type 입력은 `RangeError`로 명시 거부한다.

### I02. 기존 범용 장애물 로직 교체

- Related Files:
  - `src/game.js` :: `randomSpawnDelay`, `spawnHazard`, `updateCourse` — 기존 score 단계형 barrier/overhead/thrown 스폰을 맵별 거리형 시스템으로 대체; modify

#### Details
- 기존 `difficultyForScore`와 `HAZARD_TYPES` 호출부를 제거하거나 새 API에 맞춰 전부 수정한다.
- 바닥 창/피스톤/증기처럼 시간 지정 동작은 `age`와 `warningDuration`으로 갱신한다. 경고 동안 충돌하지 않으며 화면 경고는 T04에서 그린다.
- 장애물 위치는 플레이어/지면 좌표계와 일치시킨다. 몸에 효과가 적용되어 플레이어가 뒤로 밀려도 월드 점수는 음수가 되지 않는다.

## Acceptance Criteria
- [ ] 새 판마다 다섯 맵 중 하나가 고르고, 플레이 중 맵이 바뀌지 않는다.
- [ ] 각 맵에서 정의된 대표 위험물들이 생성된다.
- [ ] 머리 충돌과 비치명 부위 충돌이 분리되어 머리 충돌만 게임오버가 된다.
- [ ] 몸 접촉은 해당 위험물 효과를 한 번만 적용한다.
- [ ] 거리와 모드가 위험물 속도/빈도에 반영되고 최댓값이 제한된다.

## Validation
- `node --check src/obstacles.js` — 장애물 모델 구문 검사 통과.
- `node --check src/game.js` — 맵/장애물 연결 구문 검사 통과.
- `python -m http.server 8000` — 여러 판을 반복해 다섯 테마가 모두 선택되는지 확인하고, 각 테마의 위험물, 머리 충돌, 몸 접촉 효과를 브라우저에서 확인. 영구적인 개발용 선택 UI나 query parameter는 추가하지 않는다.

## Commit Message
```text
feat(game): add themed maps and hazard interactions

Plan: 2026-10-30-quadruped-clop
Phase: P01-core-gameplay
Task: T03-maps-and-hazards

- Add five randomized original map themes and signature hazards
- Separate head failure collisions from non-fatal body effects
- Scale hazard pace by distance and selected difficulty
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: aec74ee
