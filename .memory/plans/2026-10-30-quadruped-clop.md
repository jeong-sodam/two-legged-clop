# Plan: 네발 기기 게임 개편

## Goal
현재 두 발 달리기 게임을 네발 기기 게임으로 대체한다. 매 판 모드와 무작위 키 배정을 정하고, 10초 준비 시간 뒤 팔다리 입력으로 전진하며, 다섯 테마 중 무작위 맵에서 머리 충돌을 피하는 플레이를 GitHub Pages에서 직접 할 수 있게 한다. 브라우저 최고 기록과 조작 상태 표시를 제공하고, 온라인 랭킹은 구현하지 않는다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 모드/입력/준비 흐름, 네발 기기 조작, 장애물과 맵 선택을 구현해 완결된 플레이 루프를 만든다. | [P01](../phases/2026-10-30-quadruped-clop/P01-core-gameplay/phase.md) |
| P02 | `done` | 오리지널 16비트 픽셀 아트, 읽기 쉬운 HUD와 화면 흐름, 플레이 안내를 완성한다. | [P02](../phases/2026-10-30-quadruped-clop/P02-pixel-art-polish/phase.md) |

## 범위 밖
- 로그인, 닉네임 등록, 회사 Azure Cosmos DB/Azure Function 연동, 온라인 랭킹
- 모바일 터치 조작과 별도 게임 모드

## 구현 및 배포 방식
- 기존 Canvas 2D 및 ES 모듈 구성을 유지하고, 추가 런타임 의존성은 도입하지 않는다.
- 완료한 Task마다 청사진의 커밋 메시지로 커밋한다. 기존 GitHub Actions Pages workflow가 `main` 푸시 후 배포한다.
- 자동 테스트 러너가 없으므로 각 Task에서 `node --check`로 수정한 모듈을 검사하고, 필요한 시점에 로컬 정적 서버에서 실제 플레이를 확인한다.
