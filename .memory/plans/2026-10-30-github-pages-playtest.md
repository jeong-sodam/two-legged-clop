# Plan: GitHub Pages 플레이 테스트 배포 흐름

## Goal
정적 브라우저 게임을 GitHub Pages에 게시하고, `main`에 각 Task 커밋이 푸시될 때마다 자동 배포한다. `/memory-execute`가 완료 상태를 커밋한 뒤 원격 `main`으로 푸시하고 배포 완료까지 확인하도록 실행 스킬을 갱신한다. 플레이 URL은 `https://jeong-sodam.github.io/two-legged-clop/`이다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 정적 게임 게시 workflow와 플레이 안내를 추가하고, Task 완료 뒤 자동 푸시·배포 확인이 이어지도록 실행 절차를 정리합니다. | [P01](../phases/2026-10-30-github-pages-playtest/P01-pages-deploy/phase.md) |
