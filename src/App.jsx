import { useState, useEffect } from 'react'
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
      {showSetup && <SetupModal onClose={handleCloseSetup} />}
      
      <div className="widget">
        {/* 헤더 */}
        <div className="header">
          <div className="header-left">
            <div className="traffic-lights">
              <button
                className="traffic-light red"
                onClick={() => window.tmAPI?.winHide()}
                title="창 숨기기"
              />
              <button
                className="traffic-light yellow"
                onClick={() => window.tmAPI?.winHide()}
                title="최소화"
              />
              <button
                className={`traffic-light green ${pinned ? '' : 'inactive'}`}
                onClick={togglePin}
                title={pinned ? '맨 위 고정 ON' : '맨 위 고정 OFF'}
              />
            </div>
            <span className="logo">TM</span>
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
            <div className="usage-empty" style={{ color: '#10a37f' }}>API 키 설정 필요</div>
          )}
          {tab === 'gemini' && geminiUsage.loading && (
            <div className="usage-empty" style={{ color: '#4285f4' }}>확인 중...</div>
          )}
          {tab === 'gemini' && !geminiUsage.loading && geminiUsage.error && (
            <div className="usage-empty" style={{ color: '#4285f4' }}>API 키 설정 필요</div>
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

        {/* 하단 시간 */}
        <div className="footer">
          {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </>
  )
}
