import { useState, useEffect, useRef } from 'react'
import './App.css'
import SetupModal from './SetupModal'
import useChatGPT from './hooks/useChatGPT'
import useGemini from './hooks/useGemini'

const TABS = [
  { key: 'claude',  label: 'Claude',  color: '#f0c040' },
  { key: 'chatgpt', label: 'ChatGPT', color: '#10a37f' },
  { key: 'gemini',  label: 'Gemini',  color: '#4285f4' },
]

function fmt(n) {
  n = n || 0
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`
  return String(Math.floor(n))
}

// 세션(5시간) 초기화까지 남은 시간: HH:MM:SS
function fmtResetHMS(resetAt, now) {
  if (!resetAt) return '--:--:--'
  const remain = Math.max(0, resetAt - now)
  const totalSec = Math.floor(remain / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 주간 초기화까지 남은 시간: D일 H시간 M분
function fmtResetDHM(resetAt, now) {
  if (!resetAt) return '--일 --시간 --분'
  const remain = Math.max(0, resetAt - now)
  const totalMin = Math.floor(remain / 60000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  return `${d}일 ${h}시간 ${m}분`
}

// Claude 앱이 꺼져있으면 plan-usage-history.json 갱신이 멈춤 - 마지막 샘플이 오래됐으면 알려줌
const STALE_MS = 30 * 60 * 1000

export default function App() {
  const [tab, setTab] = useState('claude')
  const [pinned, setPinned] = useState(true)
  const [planUsage, setPlanUsage] = useState(null) // { fh, sd, ts }
  const [time, setTime] = useState(new Date())
  const [showSetup, setShowSetup] = useState(false)

  // ChatGPT 사용량 훅
  const chatgptUsage = useChatGPT()

  // Gemini 사용량 훅
  const geminiUsage = useGemini()

  const handleCloseSetup = () => {
    window.tmAPI?.setupClose()
    setShowSetup(false)
  }

  const openSetup = () => {
    window.tmAPI?.setupOpen()
    setShowSetup(true)
  }

  // 헤더 드래그 (네이티브 app-region 드래그는 macOS 더블클릭 줌과 충돌해서 JS로 직접 처리)
  const dragOrigin = useRef(null)
  const handleHeaderMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return
    dragOrigin.current = { x: e.screenX, y: e.screenY }
  }
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragOrigin.current) return
      const dx = e.screenX - dragOrigin.current.x
      const dy = e.screenY - dragOrigin.current.y
      dragOrigin.current = { x: e.screenX, y: e.screenY }
      window.tmAPI?.winMove(dx, dy)
    }
    const handleMouseUp = () => { dragOrigin.current = null }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // 핀 토글
  const togglePin = () => {
    const next = !pinned
    setPinned(next)
    window.tmAPI?.setAlwaysOnTop(next)
  }

  // 초기 설정 체크
  useEffect(() => {
    const checkSetup = async () => {
      const completed = await window.tmAPI?.storeGet('setup_completed')
      if (!completed) {
        window.tmAPI?.setupOpen()
        setShowSetup(true)
      }
    }
    checkSetup()
  }, [])

  // Claude plan usage 폴링
  useEffect(() => {
    const load = async () => {
      const data = await window.tmAPI?.getPlanUsage()
      if (data) setPlanUsage(data)
    }
    load()
    const id = setInterval(load, 3 * 60 * 1000)  // 3분마다 (리셋 카운트다운 경계 오차 줄이기 위해 5분→3분)
    // 숨겼다가 트레이/Dock으로 다시 열 때도 즉시 갱신 (마운트는 앱 프로세스당 한 번뿐이라 폴링만으론 안 됨)
    window.tmAPI?.onRefreshPlanUsage(load)
    return () => clearInterval(id)
  }, [])

  // 시계
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const activeTab = TABS.find(t => t.key === tab)

  if (showSetup) {
    return <SetupModal onClose={handleCloseSetup} />
  }

  return (
    <>
      <div className="widget">
        {/* 헤더 */}
        <div
          className="header"
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={() => window.tmAPI?.winMoveTopRight()}
        >
          <div className="header-left">
            <div className="traffic-lights">
              <button
                className="traffic-light red"
                onClick={() => window.tmAPI?.quitApp()}
                title="완전 종료"
              />
              <button
                className="traffic-light yellow"
                onClick={() => window.tmAPI?.winHide()}
                title="숨기기 (Dock/Spotlight에서 TM 다시 열면 복귀)"
              />
            </div>
            <span className="logo">TM</span>
          </div>
          <button
            className={`pin-toggle ${pinned ? 'on' : 'off'}`}
            onClick={togglePin}
            title={pinned ? '맨 위 고정 ON' : '맨 위 고정 OFF'}
          >
            📌 {pinned ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="divider" />

        {/* 탭 */}
        <div className="tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              style={tab === t.key ? { background: t.color, color: '#0d0d0d' } : {}}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 사용량 컨텐츠 */}
        <div className="content">
          {tab === 'claude' && planUsage && (
            <div
              className="usage-row"
              style={{ color: '#f0c040', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}
            >
              <span>● 세션 {planUsage.fh}% · 주간 {planUsage.sd}%</span>
              {time.getTime() - planUsage.lastUpdated > STALE_MS && (
                <span style={{ color: '#666', fontSize: '8px', whiteSpace: 'nowrap' }}>Claude 앱을 켜주세요</span>
              )}
            </div>
          )}
          {tab === 'claude' && !planUsage && (
            <div className="usage-empty">Claude 앱 필요</div>
          )}
          {tab === 'chatgpt' && !chatgptUsage.loading && !chatgptUsage.error && (
            <div style={{ fontSize: '9px', color: '#10a37f', lineHeight: '1.5' }}>
              <div>● 오늘 {fmt(chatgptUsage.today.tokens)} · ${chatgptUsage.today.cost.toFixed(2)}</div>
              <div>● 주간 {fmt(chatgptUsage.week.tokens)} · ${chatgptUsage.week.cost.toFixed(2)}</div>
              <div>● 월간 {fmt(chatgptUsage.month.tokens)} · ${chatgptUsage.month.cost.toFixed(2)}</div>
            </div>
          )}
          {tab === 'chatgpt' && chatgptUsage.loading && (
            <div className="usage-empty" style={{ color: '#10a37f' }}>로딩 중...</div>
          )}
          {tab === 'chatgpt' && chatgptUsage.error && (
            <div className="usage-empty clickable" style={{ color: '#10a37f' }} onClick={openSetup}>API 키 설정 필요</div>
          )}
          {tab === 'gemini' && geminiUsage.loading && (
            <div className="usage-empty" style={{ color: '#4285f4' }}>확인 중...</div>
          )}
          {tab === 'gemini' && !geminiUsage.loading && geminiUsage.error && (
            <div className="usage-empty clickable" style={{ color: '#4285f4' }} onClick={openSetup}>API 키 설정 필요</div>
          )}
          {tab === 'gemini' && !geminiUsage.loading && geminiUsage.valid && (
            <div style={{ fontSize: '9px', color: '#4285f4', lineHeight: '1.8' }}>
              <div>● API 키 연결됨 ✓</div>
              <div style={{ color: '#555', fontSize: '8px', marginTop: '2px' }}>
                Google AI Studio는 공식
              </div>
              <div style={{ color: '#555', fontSize: '8px' }}>
                Usage API를 지원하지 않아요
              </div>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); window.tmAPI?.openExternal(geminiUsage.dashboardUrl) }}
                style={{ color: '#4285f4', fontSize: '8px', display: 'block', marginTop: '4px' }}
              >
                대시보드에서 확인 →
              </a>
            </div>
          )}
        </div>

        {/* 하단: 초기화 카운트다운(좌) + 시계(우) */}
        <div className="footer">
          {planUsage && (
            <div className="reset-countdown">
              <div>세션 초기화까지 {fmtResetHMS(planUsage.fhResetAt, time.getTime())}</div>
              <div>주간 초기화까지 {fmtResetDHM(planUsage.sdResetAt, time.getTime())}</div>
            </div>
          )}
          <span className="clock">
            {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>
    </>
  )
}
