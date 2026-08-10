import { useState, useEffect } from 'react'
import './SetupModal.css'

export default function SetupModal({ onClose }) {
  const [chatgptKey, setChatgptKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // 기존에 저장된 키가 있으면 불러와서 표시
  useEffect(() => {
    const loadExisting = async () => {
      const savedChatgpt = await window.tmAPI?.storeGet('chatgpt_api_key')
      const savedGemini = await window.tmAPI?.storeGet('gemini_api_key')
      if (savedChatgpt) setChatgptKey(savedChatgpt)
      if (savedGemini) setGeminiKey(savedGemini)
    }
    loadExisting()
  }, [])

  const handleDeleteChatgpt = async () => {
    await window.tmAPI.storeDelete('chatgpt_api_key')
    setChatgptKey('')
  }

  const handleDeleteGemini = async () => {
    await window.tmAPI.storeDelete('gemini_api_key')
    setGeminiKey('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (chatgptKey.trim()) {
        await window.tmAPI.storeSet('chatgpt_api_key', chatgptKey.trim())
      }
      if (geminiKey.trim()) {
        await window.tmAPI.storeSet('gemini_api_key', geminiKey.trim())
      }
      await window.tmAPI.storeSet('setup_completed', true)
      window.tmAPI?.setupClose()
      onClose()
    } catch (err) {
      setError('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    await window.tmAPI.storeSet('setup_completed', true)
    window.tmAPI?.setupClose()
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        {/* 헤더 */}
        <div className="modal-header">
          <div className="modal-traffic-lights">
            <button className="m-light red" onClick={handleSkip} title="닫기" />
            <button className="m-light yellow" onClick={handleSkip} title="건너뛰기" />
          </div>
          <h2 className="modal-title">TM — 초기 설정</h2>
        </div>

        {/* Claude 자동 감지 */}
        <div className="detected-row">
          <span className="detected-icon">✅</span>
          <div>
            <div className="detected-label">Claude</div>
            <div className="detected-sub">로컬 파일 자동 감지됨 — 인증 불필요</div>
          </div>
        </div>

        <div className="modal-divider" />

        {/* ChatGPT */}
        <div className="input-group">
          <label>
            <span className="service-dot chatgpt" />
            ChatGPT API Key
            <span className="optional">선택</span>
          </label>
          <input
            type="text"
            placeholder="sk-proj-..."
            value={chatgptKey}
            onChange={(e) => setChatgptKey(e.target.value)}
            className="api-input"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore
          />
          <div className="link-row">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.tmAPI?.openExternal('https://platform.openai.com/api-keys') }}
              className="help-link"
            >
              API 키 발급 →
            </a>
            {chatgptKey && (
              <a href="#" onClick={(e) => { e.preventDefault(); handleDeleteChatgpt() }} className="delete-link">
                키 삭제
              </a>
            )}
          </div>
        </div>

        {/* Gemini */}
        <div className="input-group">
          <label>
            <span className="service-dot gemini" />
            Gemini API Key
            <span className="optional">선택</span>
          </label>
          <input
            type="text"
            placeholder="AIza..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="api-input"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore
          />
          <div className="link-row">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.tmAPI?.openExternal('https://aistudio.google.com/apikey') }}
              className="help-link"
            >
              API 키 발급 →
            </a>
            {geminiKey && (
              <a href="#" onClick={(e) => { e.preventDefault(); handleDeleteGemini() }} className="delete-link">
                키 삭제
              </a>
            )}
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="button-row">
          <button onClick={handleSkip} className="btn-skip">
            건너뛰기
          </button>
          <button onClick={handleSave} className="btn-save" disabled={saving}>
            {saving ? '저장 중...' : '저장하고 시작'}
          </button>
        </div>
      </div>
    </div>
  )
}
