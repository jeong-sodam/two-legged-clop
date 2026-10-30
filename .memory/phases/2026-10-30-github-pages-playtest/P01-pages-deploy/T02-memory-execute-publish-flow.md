# Task: T02 memory-execute 자동 푸시와 배포 확인

## Status: pending

## Goal
성공적으로 검증된 `/memory-execute` Task를 로컬에서만 커밋하지 않고 `origin/main`에 푸시하며, Pages workflow 성공과 최신 플레이 URL을 확인하게 합니다.

## Decision Summary
- 사용자는 각 검증 완료 Task를 `main`에 커밋/푸시해 매번 자동 배포하고, 별도 확인 단계 없이 계획된 Task를 진행하기로 정했습니다.
- T01에서 추가한 `Deploy to GitHub Pages` workflow는 공개 URL `https://jeong-sodam.github.io/two-legged-clop/`를 게시합니다.

## Implementation

### I01. memory-execute 실행 순서와 푸시 절차
- Related Files:
  - `.agents/skills/memory-execute/SKILL.md` :: `Execution Workflow`, `Step 3`, `Step 4` — 성공한 Task의 상태 동기화, commit/push, Pages 확인 흐름; modify

#### Details
- **Execution flow / state transitions**:
  1. 기존 Step 1처럼 `.memory/current.md`와 활성 Task 청사진만 읽습니다.
  2. 청사진에 지정된 구현과 검증 명령을 실행합니다. 검증이 실패하면 수정 후 재검증하고, 검증이 통과하기 전에는 완료 처리/커밋/푸시하지 않습니다.
  3. 검증 성공 후 Task 청사진 상태, 상위 `phase.md` 진행률, `.memory/current.md` 다음 포인터를 먼저 갱신합니다. 마지막 Task인 경우 현재 계획 완료 상태를 기록합니다.
  4. 변경된 소스와 메모리 상태 파일을 명시적으로 stage합니다. 무관한 수정 파일은 stage하지 않습니다. 이 저장소에서는 기존 tracked 변경 `.vite/deps/_metadata.json`을 포함하지 않습니다.
  5. 청사진의 Commit Message로 커밋한 뒤 `git push origin main`을 실행합니다. force push는 사용하지 않습니다. push 거부 시 원격 변경을 확인하고 병합/재시도 전에 충돌 상태를 보존합니다.
  6. push 후 GitHub Actions의 `Deploy to GitHub Pages` 실행을 확인하고 완료까지 기다립니다. 실패하면 원인을 확인하고 수정한 뒤 새 Task 커밋으로 다시 푸시합니다. 실패 상태를 성공으로 보고하지 않습니다.
  7. 배포 성공 시 `https://jeong-sodam.github.io/two-legged-clop/`을 보고합니다. 이후 사용자는 페이지를 새로고침해 해당 커밋의 게임을 플레이할 수 있습니다.
- **Automatic continuation**: 계획에 다음 Task가 있으면 배포 성공 후 사용자의 재확인을 기다리지 않고 다음 Task를 진행합니다. 사용자가 플레이 피드백이나 중단 요청을 주면 그 지시에 따라 현재 작업 흐름을 조정합니다.
- **Reporting**: 보고에 Task 커밋 해시, push 결과, Pages workflow 결과, 플레이 URL, 다음 활성 Task를 포함합니다.
- 기존 학습 노트와 요청 밖 결함 보고 규칙은 보존합니다.

## Acceptance Criteria
- [ ] 검증 실패 시 Task 상태를 `done`으로 표시하거나 push하지 않습니다.
- [ ] 검증 통과 후 Task/phase/current 상태가 같은 커밋에 포함됩니다.
- [ ] 성공한 Task 커밋 뒤 `git push origin main`을 실행해 Pages 자동 배포를 시작합니다.
- [ ] Pages 배포가 실패하면 공개 URL이 갱신됐다고 보고하지 않습니다.
- [ ] 배포 성공 후 플레이 URL과 다음 진행 위치를 보고하고, 다음 Task가 있으면 자동 진행합니다.
- [ ] 이미 존재하는 `.vite` 수정사항을 자동으로 stage하지 않습니다.

## Validation
- `git diff --check` — 스킬 문서 변경에 공백/패치 오류가 없습니다.
- 스킬의 `Execution Workflow`를 순서대로 검토합니다 — 검증 성공 전에 push하지 않고, 메모리 상태 파일과 Task 구현을 함께 커밋하며, push 이후 Pages 성공을 확인합니다.
- T02 완료 커밋을 `main`에 푸시한 뒤 GitHub Actions `Deploy to GitHub Pages`가 성공하고 공개 플레이 URL이 응답하는지 확인합니다.

## Commit Message
```text
feat(workflow): publish completed tasks automatically

Plan: 2026-10-30-github-pages-playtest
Phase: P01-pages-deploy
Task: T02-memory-execute-publish-flow

- Push each validated task commit to main
- Confirm GitHub Pages deployment before reporting the play URL
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
- push: pending
