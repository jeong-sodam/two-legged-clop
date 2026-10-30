# Task: T01 GitHub Pages workflow와 플레이 안내

## Status: done

## Goal
`main`에 푸시될 때마다 정적 게임을 GitHub Pages에 배포하는 workflow를 만들고, 저장소 README에서 바로 플레이 URL과 조작법을 찾을 수 있게 합니다.

## Decision Summary
- 저장소는 `jeong-sodam/two-legged-clop`의 공개 `main` 브랜치이며 GitHub Pages 배포 소스는 이미 `GitHub Actions`로 설정되어 있습니다.
- 게임은 빌드 단계가 필요 없는 HTML/CSS/바닐라 JavaScript입니다. 배포 아티팩트에는 `index.html`, `style.css`, `src/*.js`만 포함합니다.
- 기본 Pages 주소는 `https://jeong-sodam.github.io/two-legged-clop/`입니다.

## Implementation

### I01. Pages 배포 workflow
- Related Files:
  - `.github/workflows/deploy-pages.yml` :: `Deploy to GitHub Pages` workflow — `main` 변경을 정적 사이트로 게시; new

#### Details
- **Workflow events and permissions**:
  - `push.branches`는 `main` 하나로 제한합니다.
  - `permissions.contents`는 workflow 기본값으로 `read`만 허용합니다.
  - deploy job에만 `pages: write`와 `id-token: write`를 허용합니다.
  - concurrency group은 `pages`로 두고 새 배포가 이전 진행 중 배포를 대체하도록 `cancel-in-progress: true`를 설정합니다.
- **Execution flow**:
  1. `actions/checkout@v6`으로 `main`의 원본 파일을 가져옵니다.
  2. `actions/configure-pages@v5`로 Pages 메타데이터를 구성합니다.
  3. Ubuntu runner에서 `_site/src`를 만들고 `index.html`, `style.css`, `src/*.js`를 각각 `_site/`, `_site/src/`로 복사합니다. `cp .` 또는 전체 저장소 복사는 사용하지 않아 `.memory`, `.agents`, `.codeburn`, `.vite`, 예제 파일을 웹 아티팩트에 포함하지 않습니다.
  4. `actions/upload-pages-artifact@v4`에 `path: _site`를 지정합니다.
  5. `github-pages` 환경을 사용하고 `actions/deploy-pages@v4`로 아티팩트를 게시합니다. `environment.url`은 deploy step의 `page_url` 출력을 사용합니다.
- `pull_request` 배포, 사용자 지정 도메인, 별도 빌드 도구는 추가하지 않습니다.
- 참고: [GitHub custom workflow 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [configure-pages](https://github.com/actions/configure-pages), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact), [deploy-pages](https://github.com/actions/deploy-pages).

### I02. 게임 README
- Related Files:
  - `README.md` :: 최상위 프로젝트 안내 — 스타터킷 안내를 게임 및 플레이 안내로 교체; modify

#### Details
- README 제목은 `두 발 클롭`으로 합니다.
- 상단에 플레이 링크 `https://jeong-sodam.github.io/two-legged-clop/`와 게임 한 줄 설명을 둡니다.
- 기존 `index.html`의 조작 안내와 일치하도록 다리 조작(←/→/↑/↓), 이동(A/D), 점프(W), 숙이기(S), 시작(Enter/Space)을 표로 정리합니다.
- 로컬 실행은 저장소 루트에서 `python -m http.server 8000`을 실행하고 `http://localhost:8000/`을 여는 방법으로 안내합니다. ES module이 `file://`에서 제한될 수 있으므로 파일 직접 열기를 안내하지 않습니다.
- README의 Project Memory 스킬/토큰 안내는 README 상단 프로젝트 안내에서 제거하고 게임의 플레이/실행 정보로 대체합니다. 메모리 파일은 수정하지 않습니다.

## Acceptance Criteria
- [ ] `.github/workflows/deploy-pages.yml`은 `main` 푸시 때 실행되고, deploy job에 Pages의 최소 필수 권한을 설정합니다.
- [ ] 배포 artifact에는 `index.html`, `style.css`, `src/*.js`가 있고 `.memory`, `.agents`, `.codeburn`, `.vite`가 포함되지 않습니다.
- [ ] workflow가 `github-pages` 환경에 배포하고 URL 출력을 표시합니다.
- [ ] README에서 공개 플레이 URL, 조작법, 로컬 서버 실행법을 찾을 수 있습니다.
- [ ] 배포 완료 후 공개 URL의 HTML과 모듈 스크립트가 HTTP 200으로 응답하고 게임 시작 화면이 표시됩니다.
- [ ] 커밋에는 이 Task의 파일만 포함하며 이미 수정된 `.vite/deps/_metadata.json`은 stage하지 않습니다.

## Validation
- `git diff --check` — 공백/패치 오류 없이 종료합니다.
- GitHub Actions의 `Deploy to GitHub Pages` 실행을 확인합니다 — `main`에서 workflow가 성공하고 Pages 환경 URL이 표시됩니다.
- `Invoke-WebRequest -Method Head -Uri 'https://jeong-sodam.github.io/two-legged-clop/'` — 배포가 완료된 뒤 HTTP 200을 반환합니다.
- `Invoke-WebRequest -Method Head -Uri 'https://jeong-sodam.github.io/two-legged-clop/src/main.js'` — 게임 모듈 파일도 HTTP 200으로 응답합니다.
- 브라우저에서 위 플레이 URL을 열고 시작 화면을 눈으로 확인합니다.

## Commit Message
```text
feat(deploy): publish game to GitHub Pages

Plan: 2026-10-30-github-pages-playtest
Phase: P01-pages-deploy
Task: T01-pages-workflow-and-readme

- Deploy only the game entrypoint, stylesheet, and JavaScript modules
- Document the public play URL and controls
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (GitHub Actions 성공, 공개 페이지와 JS 모듈 HTTP 200)
- commit: d7c8a2e
- push: origin/main
