const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, shell } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const Store = require('electron-store')
const { fetchChatGPTUsage, fetchGeminiStatus } = require('./api')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// 240x110 트레이 위젯일 뿐 GPU 합성이 전혀 필요 없어서 GPU 프로세스를 통째로 끔
// (헬퍼 프로세스 3개 중 1개 제거). V8 힙도 이 앱 데이터량에 비해 과할 필요가 없어 캡을 둠.
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128')
let win = null
let tray = null
let isQuitting = false

// electron-store: API 키 저장소
const store = new Store()

// Claude plan-usage-history.json 경로 (OS별)
const PLAN_USAGE_PATH = {
  darwin: path.join(os.homedir(), 'Library/Application Support/Claude/plan-usage-history.json'),
  win32:  path.join(process.env.APPDATA || '', 'Claude/plan-usage-history.json'),
  linux:  path.join(os.homedir(), '.config/Claude/plan-usage-history.json'),
}[process.platform] || ''

// fh = 세션(5시간 롤링 윈도우, 하루에도 여러 번 0으로 리셋됨)
// sd = 주간(7일 주기로만 리셋됨) — 실측 데이터 기준, 필드명과 실제 의미가 반대임
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const RESET_DROP_THRESHOLD = 5 // 이전 값보다 이만큼 이상 떨어지면 리셋으로 간주

// samples를 뒤에서부터 훑어서 가장 최근 리셋(값이 뚝 떨어진) 시점을 찾는다.
// 못 찾으면(수집 기간 내내 한 번도 리셋 안 됨) 가장 오래된 샘플 시각을 윈도우 시작으로 간주.
function findWindowStart(samples, field) {
  for (let i = samples.length - 1; i > 0; i--) {
    const cur = samples[i].u[field] ?? 0
    const prev = samples[i - 1].u[field] ?? 0
    if (cur < prev - RESET_DROP_THRESHOLD) return samples[i].t
  }
  return samples[0].t
}

function readPlanUsage() {
  try {
    const raw = fs.readFileSync(PLAN_USAGE_PATH, 'utf8')
    const data = JSON.parse(raw)
    const samples = data.samples || []
    if (!samples.length) return null
    const latest = samples[samples.length - 1]
    const fhStart = findWindowStart(samples, 'fh')
    const sdStart = findWindowStart(samples, 'sd')
    return {
      fh: latest.u.fh || 0,
      sd: latest.u.sd || 0,
      fhResetAt: fhStart + FIVE_HOURS_MS,
      sdResetAt: sdStart + SEVEN_DAYS_MS,
      lastUpdated: latest.t,
    }
  } catch { return null }
}

function buildTrayTooltip() {
  const u = readPlanUsage()
  const claude = u ? `Claude 세션 ${u.fh}% | 주간 ${u.sd}%` : 'Claude --'
  return `TM — Token Monitor\n${claude}\nChatGPT --\nGemini --`
}

function buildTrayMenu() {
  const u = readPlanUsage()
  const claudeLabel = u ? `Claude  세션 ${u.fh}% · 주간 ${u.sd}%` : 'Claude  --'

  return Menu.buildFromTemplate([
    { label: 'Token Monitor', enabled: false },
    { type: 'separator' },
    { label: claudeLabel,  enabled: false, },
    { label: 'ChatGPT  --', enabled: false },
    { label: 'Gemini   --', enabled: false },
    { type: 'separator' },
    { label: '창 열기', click: () => { win.show(); win.focus() } },
    { type: 'separator' },
    { label: '완전 종료', click: () => app.exit(0) },
  ])
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  // 아이콘 설정
  const iconPath = process.platform === 'darwin' 
    ? path.join(__dirname, '../assets/TM.icns')
    : path.join(__dirname, '../assets/tm_icon.png')

  win = new BrowserWindow({
    width: 240,
    height: 110,
    x: width - 256,
    y: 16,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    minWidth: 200,
    minHeight: 90,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Google OAuth 팝업 완전 차단
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'Autofill,AutofillSuggestionsFeature',
      partition: 'persist:tm-widget',
      // 입력 필드가 API 키 하나뿐이라 스펠체크 사전 로딩이 불필요한 메모리 낭비
      spellcheck: false,
      backgroundThrottling: true,
    },
  })

  // alwaysOnTop 옵션만으로는 다른 Space나 전체화면 앱 위로 뜨지 않음 -
  // 창 레벨을 screen-saver로 올리고 모든 워크스페이스/전체화면에서 보이도록 설정
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 닫기 → 숨기기 (단, Cmd+Q/Dock 종료로 실제 종료하는 중이면 그대로 닫음)
  win.on('close', (e) => {
    if (isQuitting) return
    e.preventDefault()
    win.hide()
  })

  // 숨겨뒀다가 트레이/Dock으로 다시 열었을 때 렌더러가 마운트 시점의 낡은
  // planUsage를 계속 보여주던 문제 — show될 때마다 즉시 재조회하도록 알림
  win.on('show', () => {
    win.webContents.send('refresh-plan-usage')
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray_icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    // 검정 아이콘 + 다크 메뉴바 조합이면 안 보이는 문제 - 템플릿 이미지로 지정해서
    // macOS가 라이트/다크 메뉴바에 맞게 알아서 반전 렌더링하도록 함
    icon.setTemplateImage(true)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip(buildTrayTooltip())

  // 맥: 클릭 → 창 토글 / 우클릭 → 메뉴
  // 윈도우: 클릭 → 창 토글 / 우클릭 → 사용량 메뉴
  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })

  tray.on('right-click', () => {
    const menu = buildTrayMenu()
    tray.setContextMenu(menu)
    tray.popUpContextMenu()
  })

  // 5초마다 트레이 툴팁 + 메뉴 갱신
  setInterval(() => {
    tray.setToolTip(buildTrayTooltip())
  }, 5000)
}

// IPC: 기존 + store 추가
ipcMain.handle('get-plan-usage', async () => readPlanUsage())
ipcMain.handle('set-always-on-top', (_, val) => {
  win.setAlwaysOnTop(val, val ? 'screen-saver' : 'normal')
  win.setVisibleOnAllWorkspaces(val, { visibleOnFullScreen: true })
})
ipcMain.on('win-move', (_, { dx, dy }) => {
  const [x, y] = win.getPosition()
  win.setPosition(x + dx, y + dy)
})
ipcMain.on('win-move-top-right', () => {
  const { width } = screen.getPrimaryDisplay().workAreaSize
  win.setPosition(width - 256, 16)
})
ipcMain.on('win-hide', () => win.hide())
ipcMain.on('quit-app', () => app.quit())

// 창 크기 변경
ipcMain.on('set-window-size', (_, { width, height }) => {
  win.setSize(width, height)
  win.center()
})

// SetupModal 열림/닫힘 - 창 크기 및 위치 변경
ipcMain.on('setup-open', () => {
  // 원래 위치와 크기 저장
  const [origX, origY] = win.getPosition()
  const [origW, origH] = win.getSize()
  store.set('_window_state', { x: origX, y: origY, width: origW, height: origH })
  // SetupModal용 크기: 현재 크기의 3배 기준 720x480, 모니터 정중앙
  win.setResizable(false)
  win.setSize(720, 480)
  win.center()
  win.setAlwaysOnTop(true)
})

ipcMain.on('setup-close', () => {
  const { width } = screen.getPrimaryDisplay().workAreaSize
  store.delete('_window_state')
  win.setResizable(false)
  win.setSize(240, 110)
  win.setPosition(width - 256, 16)
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
})

// 외부 링크 열기 (Google OAuth 팝업 방지용)
ipcMain.handle('open-external', (_, url) => {
  const allowed = [
    'https://platform.openai.com',
    'https://aistudio.google.com',
  ]
  if (allowed.some(a => url.startsWith(a))) {
    shell.openExternal(url)
  }
})

// Store IPC
ipcMain.handle('store-get', (_, key) => store.get(key))
ipcMain.handle('store-set', (_, key, val) => store.set(key, val))
ipcMain.handle('store-delete', (_, key) => store.delete(key))

// ChatGPT Usage — main process에서 호출 (프록시/CORS 우회)
ipcMain.handle('fetch-chatgpt-usage', async () => {
  const apiKey = store.get('chatgpt_api_key')
  if (!apiKey) return { error: 'API 키 없음' }
  try {
    return await fetchChatGPTUsage(apiKey)
  } catch (err) {
    return { error: err.message }
  }
})

// Gemini 유효성 확인 — main process에서 호출
ipcMain.handle('fetch-gemini-status', async () => {
  const apiKey = store.get('gemini_api_key')
  if (!apiKey) return { error: 'API 키 없음' }
  try {
    return await fetchGeminiStatus(apiKey)
  } catch (err) {
    return { error: err.message }
  }
})

app.whenReady().then(() => {
  // 앱 이름 설정 (Dock에 표시됨)
  app.setName('TM')
  
  createWindow()
  createTray()

  if (process.platform === 'darwin') {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })
    // 카카오톡처럼 Dock 아이콘 + 메뉴바 트레이 아이콘을 동시에 표시
    app.dock.setIcon(path.join(__dirname, '../assets/tm_icon_1024.png'))
  }
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', (e) => e.preventDefault())

// Dock 아이콘 클릭 시 창이 숨겨져 있으면 다시 표시
app.on('activate', () => {
  if (win) {
    win.show()
    win.focus()
  }
})
