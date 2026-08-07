const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, shell } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const Store = require('electron-store')
const { fetchChatGPTUsage, fetchGeminiStatus } = require('./api')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
let win = null
let tray = null

// electron-store: API 키 저장소
const store = new Store()

// Claude plan-usage-history.json 경로 (OS별)
const PLAN_USAGE_PATH = {
  darwin: path.join(os.homedir(), 'Library/Application Support/Claude/plan-usage-history.json'),
  win32:  path.join(process.env.APPDATA || '', 'Claude/plan-usage-history.json'),
  linux:  path.join(os.homedir(), '.config/Claude/plan-usage-history.json'),
}[process.platform] || ''

function readPlanUsage() {
  try {
    const raw = fs.readFileSync(PLAN_USAGE_PATH, 'utf8')
    const data = JSON.parse(raw)
    const samples = data.samples || []
    if (!samples.length) return null
    const latest = samples[samples.length - 1]
    return { fh: latest.u.fh || 0, sd: latest.u.sd || 0 }
  } catch { return null }
}

function buildTrayTooltip() {
  const u = readPlanUsage()
  const claude = u ? `Claude 세션 ${u.sd}% | 주간 ${u.fh}%` : 'Claude --'
  return `TM — Token Monitor\n${claude}\nChatGPT --\nGemini --`
}

function buildTrayMenu() {
  const u = readPlanUsage()
  const claudeLabel = u ? `Claude  세션 ${u.sd}% · 주간 ${u.fh}%` : 'Claude  --'

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
    height: 130,
    x: width - 256,
    y: height - 146,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: true,
    minWidth: 200,
    minHeight: 110,
    skipTaskbar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Google OAuth 팝업 완전 차단
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'Autofill,AutofillSuggestionsFeature',
      partition: 'persist:tm-widget',
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 닫기 → 숨기기
  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tm_icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
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
ipcMain.handle('set-always-on-top', (_, val) => win.setAlwaysOnTop(val))
ipcMain.on('win-move', (_, { dx, dy }) => {
  const [x, y] = win.getPosition()
  win.setPosition(x + dx, y + dy)
})
ipcMain.on('win-hide', () => win.hide())

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
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const savedState = store.get('_window_state')
  win.setResizable(true)
  if (savedState) {
    win.setSize(savedState.width, savedState.height)
    win.setPosition(savedState.x, savedState.y)
    store.delete('_window_state')
  } else {
    win.setSize(240, 130)
    win.setPosition(width - 256, height - 146)
  }
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
    // 맥: 독 아이콘 숨기기 (메뉴바 앱처럼)
    app.dock.hide()
  }
})

app.on('window-all-closed', (e) => e.preventDefault())
