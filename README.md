# TM — Token Monitor

> Claude · ChatGPT · Gemini 사용량을 실시간으로 보여주는 데스크탑 위젯

[![Build & Release](https://github.com/Apollo-Chanhwi-Lee/tm-widget/actions/workflows/build.yml/badge.svg)](https://github.com/Apollo-Chanhwi-Lee/tm-widget/actions/workflows/build.yml)
[![Latest Release](https://img.shields.io/github/v/release/Apollo-Chanhwi-Lee/tm-widget)](https://github.com/Apollo-Chanhwi-Lee/tm-widget/releases/latest)

## 다운로드

👉 **[다운로드 페이지](https://apollo-chanhwi-lee.github.io/tm-widget)** | **[GitHub Releases](https://github.com/Apollo-Chanhwi-Lee/tm-widget/releases)**

| OS | 파일 |
|---|---|
| macOS | `.dmg` (Apple Silicon + Intel) |
| Windows | `.exe` (NSIS 설치 프로그램) |

## 기능

### Claude
- 로컬 파일 읽기 (`~/Library/Application Support/Claude/plan-usage-history.json`)
- 현재 세션 % + 주간 % 실시간 표시

### ChatGPT
- OpenAI Usage API 연동
- 오늘/주간/월간 토큰 + 비용 표시
- 30분마다 자동 갱신

### Gemini
- Google AI Studio API 연동
- 로컬 사용량 추적 (토큰 + 요청 횟수)
- 할당량 표시 (60 RPM 기준)

### UI
- 탭별 사용량 전환
- 맨 위 고정 ON/OFF (📌/📍)
- 드래그로 위치 이동
- 트레이 아이콘 (우클릭 메뉴)
- 완전 종료 옵션

## 개발

### 로컬 개발

```bash
npm install
npm run dev       # 개발 서버 (Vite + Electron)
```

### 빌드

```bash
npm run build:mac # macOS .dmg 빌드
npm run build:win # Windows .exe 빌드
```

### 릴리즈

```bash
git tag v1.0.0
git push origin v1.0.0
```

→ GitHub Actions가 자동으로 빌드 + Releases 업로드

## 기술 스택

- **Electron 32** — 크로스 플랫폼 데스크탑 앱
- **React 18** — UI 프레임워크
- **Vite 5** — 빌드 도구
- **electron-store** — 설정/API 키 저장
- **electron-builder** — 배포 패키징

## 라이선스

MIT License — [Apollo-Chanhwi-Lee](https://github.com/Apollo-Chanhwi-Lee)
