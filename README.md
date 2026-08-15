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

### ⚠️ 설치 시 경고가 뜨나요? / Seeing a security warning?

이 앱은 유료 개발자 인증서로 서명되어 있지 않습니다 (Apple/Microsoft 인증서는 연 단위 비용이 듭니다). 그래서 처음 실행할 때 OS가 경고를 띄우는 게 정상입니다 — 바이러스가 아닙니다.
This app isn't signed with a paid developer certificate. The OS warning on first launch is expected — it is not a virus.

**macOS**
1. `.dmg`를 열고 `TM.app`을 `Applications` 폴더로 드래그
2. Finder에서 `TM.app`을 **우클릭 → 열기(Open)** → 뜨는 창에서 다시 **열기(Open)** 클릭
   (Dock에서 더블클릭하면 "손상되었음" 문구가 뜰 수 있으니 반드시 우클릭으로 여세요)
3. 그래도 안 열리면 터미널에서: `xattr -cr /Applications/TM.app`

**Windows**
1. `TM Setup x.x.x.exe` 실행 시 "Windows에서 PC를 보호했습니다" 창이 뜨면
2. **추가 정보(More info)** 클릭 → **실행(Run anyway)** 클릭

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
- 맨 위 고정 ON/OFF 토글 (📌 ON / 📌 OFF) / Always-on-top toggle
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
| **Electron 43** | Cross-platform desktop framework |
| **React 18** | UI framework |
| **Vite 5** | Build tool |
| **electron-store** | Config & API key storage |
| **electron-builder** | Distribution packaging |

---

## 라이선스 / License

MIT License — [Apollo-Chanhwi-Lee](https://github.com/Apollo-Chanhwi-Lee)
