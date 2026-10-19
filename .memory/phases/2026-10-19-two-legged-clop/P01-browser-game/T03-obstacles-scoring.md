# 작업: T03 장애물과 점수

## 상태: 대기

## 목표
스크롤되는 코스에 지면 장애물, 머리 위 장애물, 던져지는 물체를 추가합니다. WASD 회피 동작을 적용하고 이동 거리와 회피 점수를 지급하며, 점수에 따라 속도와 장애물 종류를 늘립니다.

## 결정 요약
- 생존 거리에 따라 기본 점수를 얻고, 각 장애물을 성공적으로 피하면 보너스 점수를 얻습니다.
- 점수가 높아지면 코스 속도가 증가하고 갑자기 나타나는 장애물과 투사체가 추가됩니다. 충돌은 넘어짐을 직접 일으키지 않으며 균형 상실만 게임을 끝냅니다.

## 구현 내용

### I01. 장애물 모델, 생성, 갱신 정의
- 관련 파일:
  - `src/obstacles.js` :: 장애물 생성, 이동, 충돌, 난이도 함수; 신규
  - `src/game.js` :: 장애물 목록 보관 및 갱신; 수정
- 내보낼 상수와 함수:
  ```js
  export const HAZARD_TYPES = ['barrier', 'overhead', 'thrown'];
  export function difficultyForScore(score: number): { level: number; speed: number; spawnMin: number; spawnMax: number; allowedTypes: string[] }
  export function createHazard(type: string, x: number, groundY: number, rng: () => number): Hazard
  export function intersects(a: Rect, b: Rect): boolean
  ```
- 데이터 구조:
  ```js
  Hazard = { id: number, type: 'barrier'|'overhead'|'thrown', x:number, y:number,
    width:number, height:number, vx:number, vy:number, age:number,
    passed:boolean, resolved:boolean }
  Rect = { x:number, y:number, width:number, height:number }
  ```
- 난이도 설정: `level = floor(score / 500)`, `speed = 250 + min(level, 8) * 22` 픽셀/초, `spawnMin = 1.65 - min(level, 8)*0.07`초, `spawnMax = 2.45 - min(level, 8)*0.08`초로 계산합니다. 장벽은 처음부터 나옵니다. 머리 위 장애물은 레벨 1, 투사체는 레벨 2부터 허용합니다. 레벨 3부터 생성 중 20%는 갑작스러운 장애물입니다. 화면 오른쪽 바깥 대신 x=640에 나타나고, 충돌 판정 전 0.35초 동안 경고 표시를 합니다.
- 장벽 크기는 34x52, 위치는 `groundY-52`입니다. 머리 위 장애물 크기는 76x30, 위치는 `groundY-96`입니다. 투사체 크기는 28x28이며 x=1000, y=`groundY-145`에서 시작하고 vx는 -speed, vy는 0입니다. 투사체는 `sin(age*5)*18`만큼 위아래로 움직입니다. x+width가 -40보다 작아지면 제거합니다.
- 생성 대기 시간은 `[spawnMin,spawnMax]`에서 무작위로 고릅니다. 별도 의존성은 추가하지 않습니다. 테스트와 조정을 위해 rng를 주입할 수 있게 하고 기본값으로 `Math.random`을 사용합니다.

### I02. 충돌, 회피 점수 처리
- 관련 파일:
  - `src/game.js` :: 충돌 판정과 점수 처리; 수정
- 데이터:
  - `score: number`(표시용 정수), `distance: number`(픽셀), `distanceRemainder: number`, `obstaclesAvoided: number`, `spawnTimer: number`, `nextHazardId: number`.
- playing 상태일 때 거리를 `코스 속도 * dt`만큼 증가시킵니다. 나머지를 누적해 10픽셀마다 점수 1점을 추가합니다. 플레이어와 장애물이 겹치면 장애물을 해결됨으로 표시하고 비치명적 비틀거림을 적용합니다. 수평 속도를 -80으로 바꾸고, 플레이어 중심이 장애물 중심보다 왼쪽이면 균형에 +0.16, 오른쪽이면 -0.16을 더합니다. 균형은 `[-1.2,1.2]`로 제한합니다. 플레이어 x를 지나간 장애물은 충돌하지 않았을 때 한 번만 회피 처리하고 +100점 및 회피 횟수 1을 더합니다.
- 플레이어 충돌 상자는 x=`player.x-18`, y=`player.y - (crouching ? 45 : 85)`, 너비 36, 높이는 숙일 때 45 아니면 85입니다. 점프 시 y가 자연스럽게 달라집니다. 장벽은 점프나 좌우 이동으로, 머리 위 장애물은 숙이기로, 투사체는 이동·점프·숙이기로 피할 수 있습니다. 충돌 자체로 게임을 끝내지 않습니다.

### I03. 장애물과 점수판 그리기
- 관련 파일:
  - `src/game.js` :: 장애물 도형과 상단 점수판 렌더링; 수정
- 현재 Canvas 렌더링에 종류별 색을 적용해 그립니다. 장벽은 갈색, 머리 위 장애물은 올리브색, 투사체는 주황색으로 구분합니다. 갑작스러운 장애물은 충돌 가능 전 짧게 흰색/빨간색으로 번쩍입니다. 점수, 난이도 레벨, 회피 횟수를 표시합니다. 이 작업에서는 최고 점수 표시를 추가하지 않습니다.

## 완료 조건
- [ ] 점수 구간에 따라 세 종류 장애물이 생성되고 왼쪽으로 이동합니다.
- [ ] 회피 조작으로 장애물을 피할 수 있고, 충돌 시 비틀거리지만 즉시 게임이 끝나지 않습니다.
- [ ] 생존 거리 10픽셀마다 1점, 장애물을 통과할 때마다 100점을 한 번 얻습니다.
- [ ] 500점마다 속도가 증가하고 생성 간격이 줄며 지정된 단계에 장애물 유형이 추가됩니다.
- [ ] 레벨 3 이상에서 갑자기 나타나는 장애물은 충돌 전에 경고를 표시합니다.

## 검증
- `python -m http.server 8000`을 실행하고 `http://localhost:8000/`에서 점수 구간별 장애물, 경고 표시, 회피, 충돌 비틀거림, 점수를 확인합니다. 균형을 잃을 때만 게임이 끝나는지도 확인합니다.

## 커밋 메시지
```text
feat(game): 단계별 장애물과 점수 추가

Plan: 2026-10-19-two-legged-clop
Phase: P01-browser-game
Task: T03-obstacles-scoring

- 장벽, 머리 위 장애물, 투사체와 돌발 장애물 추가
- 회피 보너스, 거리 점수와 점수 구간별 난이도 추가
```

## 진행 상태
- [ ] 구현 완료
- [ ] 검증 통과
- 커밋: 대기

