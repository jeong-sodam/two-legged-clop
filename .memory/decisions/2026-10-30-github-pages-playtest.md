# Decisions: GitHub Pages 플레이 테스트 배포 흐름

- Date: 2026-10-30
- Status: Confirmed

## D01. 호스팅 대상
- **Chosen**: GitHub Pages를 사용해 정적 브라우저 게임을 호스팅한다.
- **Rationale**: 게임은 정적 HTML, CSS, JavaScript로 동작하며 원격 저장소도 GitHub에 연결되어 있다.

## D02. 배포 트리거
- **Chosen**: `main` 브랜치에 변경이 푸시될 때마다 GitHub Actions로 자동 배포한다.
- **Rationale**: 새 빌드를 별도 수동 절차 없이 URL에서 플레이할 수 있다.

## D03. 변경 사항 푸시 시점
- **Chosen**: `/memory-execute`에서 각 Task를 구현하고 검증한 뒤 Task별로 커밋하고 `main`에 푸시한다.
- **Rationale**: Task 단위의 변경 이력을 유지하면서 각 완료분을 바로 배포할 수 있다.

## D04. 플레이 피드백 흐름
- **Chosen**: 배포 완료 후에도 계획된 Task를 계속 진행한다. 사용자는 같은 Pages URL을 새로고침해 최신 배포를 플레이하고, 원하는 시점에 피드백을 전달한다.
- **Rationale**: 개발을 매 배포마다 멈추지 않으면서 언제든 최신 버전을 직접 확인할 수 있다.

## D05. Pages 설정과 주소
- **Chosen**: 저장소의 기본 GitHub Pages URL을 사용하고, GitHub Actions 배포에 필요한 workflow 및 저장소 설정을 구성한다.
- **Rationale**: 별도 사용자 지정 도메인 요청이 없으며, 원격 저장소를 기준으로 바로 플레이할 수 있는 주소를 제공한다.

## D06. 저장소와 플레이 페이지 공개 범위
- **Chosen**: GitHub 저장소와 Pages 플레이 페이지를 공개한다. 저장소는 GitHub에서 `public`으로 변경되었고 Pages의 배포 소스는 `GitHub Actions`로 설정되었다.
- **Rationale**: 사용자가 공개 저장소 및 Pages 설정을 직접 변경했다고 확인했다. 누구나 저장소와 플레이 페이지에 접근할 수 있다.
