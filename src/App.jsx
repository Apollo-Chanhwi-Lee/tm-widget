import { useState, useEffect, useRef } from 'react'
import './App.css'
import SetupModal from './SetupModal'

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

export default function App() {
  const [tab, setTab] = useState('claude')
  const [pinned, setPinned] = useState(true)
  const [planUsage, setPlanUsage] = useState(null) // { fh, sd, ts }
  const [time, setTime] = useState(new Date())
  const [showSetup, setShowSetup] = useState(false)

  // 드래그
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 })

  const onMouseDown = (e) => {
    dragRef.current = { dragging: true, startX: e.screenX, startY: e.screenY }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
  const onMouseMove = (e) => {
    if (!dragRef.current.dragging) return
    const dx = e.screenX - dragRef.current.startX
    const dy = e.screenY - dragRef.current.startY
    dragRef.current.startX = e.screenX
    dragRef.current.startY = e.screenY
    window.tmAPI?.winMove(dx, dy)
  }
  const onMouseUp = () => {
    dragRef.current.dragging = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

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
    const id = setInterval(load, 30 * 60 * 1000)  // 30분마다
    return () => clearInterval(id)
  }, [])

  // 시계
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const activeTab = TABS.find(t => t.key === tab)

  return (
    <>
      {showSetup && <SetupModal onClose={() => setShowSetup(false)} />}
      
      <div className="widget">
        {/* 헤더 */}
        <div className="header" onMouseDown={onMouseDown}>
          <span className="logo">TM</span>
          <div className="header-right">
            <button
              className={`pin-btn ${pinned ? 'pinned' : ''}`}
              onClick={togglePin}
              title={pinned ? '고정 해제' : '맨 위 고정'}
            >
              {pinned ? '📌ON' : '📍OFF'}
            </button>
            <button className="close-btn" onClick={() => window.tmAPI?.winHide()}>✕</button>
          </div>
        </div>

        <div className="divider" />

        {/* 현재 세션 바 */}
        <div className="session-row">
          {planUsage ? (
            <>
              <div className="session-label">
                <span style={{ color: '#f0c040' }}>● 세션 {planUsage.sd}%</span>
                <span style={{ color: '#555', margin: '0 4px' }}>|</span>
                <span style={{ color: '#888' }}>주간 {planUsage.fh}%</span>
              </div>
              <div className="progress-bg">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(planUsage.sd, 100)}%`,
                    background: planUsage.sd > 85 ? '#ff4444' : planUsage.sd > 60 ? '#ffaa00' : '#f0c040'
                  }}
                />
              </div>
            </>
          ) : (
            <div className="session-label" style={{ color: '#444' }}>Claude 앱 감지 중...</div>
          )}
        </div>

        <div className="divider-thin" />

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
            <div className="usage-row" style={{ color: '#f0c040' }}>
              <span>● 세션 {planUsage.sd}% · 주간 {planUsage.fh}%</span>
            </div>
          )}
          {tab === 'claude' && !planUsage && (
            <div className="usage-empty">Claude 앱 필요</div>
          )}
          {tab === 'chatgpt' && (
            <div className="usage-empty" style={{ color: '#10a37f' }}>API 키 설정 필요</div>
          )}
          {tab === 'gemini' && (
            <div className="usage-empty" style={{ color: '#4285f4' }}>API 키 설정 필요</div>
          )}
        </div>

        {/* 하단 시간 */}
        <div className="footer">
          {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </>
  )
}
