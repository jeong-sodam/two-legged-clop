---
name: memory-execute
description: Execute the active task pointer sequentially from .memory/current.md, validate, commit, sync phase.md, and advance current.md pointer automatically.
---

You are an expert software engineer executor. Your goal is to execute the active task referenced by `.memory/current.md`, validate it, commit it, and advance the pointer.

## Execution Workflow (Step-by-Step)

### Step 1: Read Current Pointer
1. Read `.memory/current.md`.
2. Extract the file path of `Active Task` (e.g., `.memory/phases/product-api/P01-core-crud/T01-product-schema.md`).
3. Load and read ONLY that active task blueprint file.

### Step 2: Implement & Validate
1. Implement the exact specifications described in the task blueprint (Target files, models, DTOs, logic).
2. Run the specified `검증 커맨드 (Validation)` (e.g., `pnpm test path/to/spec.ts` or linter/build).
3. If tests fail, fix the implementation until all validation commands pass cleanly.

### Step 3: Bottom-Up State Synchronization & Pointer Advance
Once validation succeeds:
1. **Update Task Blueprint**:
   - Change `Status` from `pending` (or `in_progress`) to `done`.
2. **Git Commit**:
   - Stage only the files named by the active Task blueprint and the Task blueprint itself. Never stage unrelated working-tree changes.
   - Commit using the `Commit Message` specified in the blueprint. Do not push yet.
3. **Update `phase.md` Dashboard**:
   - In the parent `phase.md`, change the completed task's status to `done ✅`.
   - If there is a next task (e.g. `T02`), set its status to `in_progress 🔵`.
   - Update `Progress: done X/Y (active: T02)`.
4. **Advance `.memory/current.md` Pointer**:
   - Update `Active Task` to the next pending task and write its concrete action under `Next Step (IMPORTANT)`.
   - If no task remains, mark the Phase and Plan complete and say that there is no active task.
5. **Include state synchronization in the Task commit**:
   - The Task commit created in Step 2 must still be the current local `HEAD` and must not have been pushed.
   - Stage only the updated parent `phase.md` and `.memory/current.md` (and the Plan file if it changed), then run `git commit --amend --no-edit` so implementation, Task status, Phase progress, and current pointer are one commit with the blueprint's message.
   - If `HEAD` is not the unpushed Task commit or amend fails, stop and inspect the Git state. Never amend an already-pushed commit.
6. **Push the validated Task commit**:
   - Push with `git push origin main`. Never use force push.
   - If Git rejects the push, inspect the remote changes and preserve the local work before resolving; do not reset or overwrite remote history.
7. **Wait for GitHub Pages deployment**:
   - For this project, identify the `Deploy to GitHub Pages` workflow run for the pushed commit and wait for a successful conclusion before reporting the play URL.
   - If the workflow fails, do not claim the deployment succeeded. Keep the active Task available, fix the cause in a follow-up commit, push again, and verify the new run.

### Step 4: Report to User
Report concisely:
- Completed Task title and commit hash
- Validation and Pages deployment result
- Public play URL after a successful Pages deployment
- Next Active Task and what will be done next
- If the user asked to finish all planned Tasks or continue automatically, proceed to the next Task without asking again. Otherwise, ask whether to continue.

#### 보고 규칙: 초급 개발자용 학습 노트 (필수)

위 보고에 이어 아래 3가지를 반드시 포함한다. 목표는 **이 커밋을 나중에 처음 보는 사람이 혼자 이해할 수 있게** 하는 것이다. 변경이 사소하면 분량도 짧게 쓴다.

1. **핵심 변경 부분** — 파일별로 "무엇을 / 왜" 바꿔는지를 설명하고, 핵심 지점은 **짧은 코드 조각**을 인용한다(전체 diff 나열 금지). 사용한 패턴·API가 처음 등장하는 것이면 한 줄로 설명한다.
2. **알아야 할 점** — 이 변경을 이해하거나 이어서 작업할 때 모르면 사고로 이어지는 내용. 예: 손대면 안 되는 인접 코드와 그 이유, 부수 효과가 있는 전역 상태·캡슐, 검증이 잡아주지 못하는 영역(육안 확인 필요 항목).
3. **요청한 내용은 아니지만 꼭 함께 처리했어야 할 부분** — 구현 중 발견한 기존 결함·부채(깨진 인접 기능, 죽은 코드·낡은 셀렉터, 누락된 검증·권한 체크, 동일 패턴의 다른 발생 지점, 다른 브랜치에도 반영이 필요한 수정)를 목록으로 알린다.
   - **이번 Task 범위 밖의 변경을 임의로 수행하지 않는다.** 발견 사실·예상 영향·권장 조치만 적고, 진행 여부는 사용자가 정한다.
   - 발견이 없으면 "특이사항 없음"으로 명시한다(항목을 생략하지 않는다).
