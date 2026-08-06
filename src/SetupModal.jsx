import { useState } from 'react'
import './SetupModal.css'

export default function SetupModal({ onClose }) {
  const [chatgptKey, setChatgptKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!chatgptKey.trim() && !geminiKey.trim()) {
      setError('최소 하나 이상의 API 키를 입력하세요')
      return
    }

    try {
      if (chatgptKey.trim()) {
        await window.tmAPI.storeSet('chatgpt_api_key', chatgptKey.trim())
      }
      if (geminiKey.trim()) {
        await window.tmAPI.storeSet('gemini_api_key', geminiKey.trim())
      }
      await window.tmAPI.storeSet('setup_completed', true)
      onClose()
    } catch (err) {
      setError('저장 실패: ' + err.message)
    }
  }

  const handleSkip = async () => {
    await window.tmAPI.storeSet('setup_completed', true)
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="modal-title">TM 초기 설정</h2>
        <p className="modal-desc">
          ChatGPT와 Gemini의 사용량을 추적하려면<br/>
          API 키를 입력하세요. (선택사항)
        </p>

        <div className="input-group">
          <label>ChatGPT API Key</label>
          <input
            type="password"
            placeholder="sk-proj-..."
            value={chatgptKey}
            onChange={(e) => setChatgptKey(e.target.value)}
            className="api-input"
          />
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="help-link"
          >
            API 키 발급 →
          </a>
        </div>

        <div className="input-group">
          <label>Gemini API Key</label>
          <input
            type="password"
            placeholder="AIza..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="api-input"
          />
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="help-link"
          >
            API 키 발급 →
          </a>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="button-row">
          <button onClick={handleSkip} className="btn-skip">
            건너뛰기
          </button>
          <button onClick={handleSave} className="btn-save">
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
