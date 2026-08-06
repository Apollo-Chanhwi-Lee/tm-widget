# TM — Token Monitor

> Claude · ChatGPT · Gemini 사용량을 실시간으로 보여주는 데스크탑 위젯  
> A real-time desktop widget that displays your Claude · ChatGPT · Gemini token usage

[![Build & Release](https://github.com/Apollo-Chanhwi-Lee/tm-widget/actions/workflows/build.yml/badge.svg)](https://github.com/Apollo-Chanhwi-Lee/tm-widget/actions/workflows/build.yml)
[![Latest Release](https://img.shields.io/github/v/release/Apollo-Chanhwi-Lee/tm-widget)](https://github.com/Apollo-Chanhwi-Lee/tm-widget/releases/latest)

---

## 다운로드 / Download

👉 **[다운로드 페이지 / Download Page](https://apollo-chanhwi-lee.github.io/tm-widget)** | **[GitHub Releases](https://github.com/Apollo-Chanhwi-Lee/tm-widget/releases)**

| OS | File |
|---|---|
| macOS | `.dmg` (Apple Silicon + Intel) |
| Windows | `.exe` (NSIS Installer) |

---

## 기능 / Features

### Claude
- 로컬 파일에서 사용량 자동 감지 (인증 불필요)  
  Reads usage directly from local Claude app files — no authentication required
- 현재 세션 % + 주간 % 실시간 표시  
  Displays current session % and weekly usage % in real time

### ChatGPT
- OpenAI Usage API 연동  
  Integrated with OpenAI Usage API
- 오늘/주간/월간 토큰 + 비용 표시  
  Shows today / weekly / monthly token count and cost
- 30분마다 자동 갱신 / Auto-refreshes every 30 minutes

### Gemini
- Google AI Studio API 연동  
  Integrated with Google AI Studio API
- 로컬 사용량 추적 (토큰 + 요청 횟수)  
  Tracks local usage (tokens + request count)
- 할당량 표시 (60 RPM 기준) / Displays quota usage (based on 60 RPM limit)

### UI
- 탭별 서비스 전환 / Switch between services via tabs
- 맨 위 고정 ON/OFF (📌/📍) / Always-on-top toggle
- 드래그로 위치 이동 / Drag to reposition
- 트레이 아이콘 우클릭 메뉴 / System tray icon with right-click menu
- 완전 종료 옵션 / Full quit option

---

## 개발 / Development

### 로컬 개발 / Local Development

```bash
npm install
npm run dev       # Dev server (Vite + Electron)
```

### 빌드 / Build

```bash
npm run build:mac # macOS .dmg
npm run build:win # Windows .exe
```

### 릴리즈 / Release

```bash
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions automatically builds and uploads to Releases
```

---

## 기술 스택 / Tech Stack

| | |
|---|---|
| **Electron 32** | Cross-platform desktop framework |
| **React 18** | UI framework |
| **Vite 5** | Build tool |
| **electron-store** | Config & API key storage |
| **electron-builder** | Distribution packaging |

---

## 라이선스 / License

MIT License — [Apollo-Chanhwi-Lee](https://github.com/Apollo-Chanhwi-Lee)
