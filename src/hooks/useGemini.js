import { useState, useEffect } from 'react'

/**
 * Gemini Usage Hook
 *
 * 현실: Google AI Studio는 공식 Usage API 없음
 * → API 키 유효성만 확인, 사용량은 대시보드 링크 안내
 * → 추후 Vertex AI Cloud Billing API 연동 시 교체 가능
 */
export default function useGemini() {
  const [data, setData] = useState({
    valid: false,
    loading: true,
    error: null,
    dashboardUrl: 'https://aistudio.google.com/app/usage',
  })

  useEffect(() => {
    let mounted = true

    const checkKey = async () => {
      try {
        const result = await window.tmAPI?.fetchGeminiStatus()
        if (!mounted) return

        if (result?.error) {
          setData(prev => ({ ...prev, loading: false, error: result.error, valid: false }))
          return
        }

        setData({
          valid: true,
          loading: false,
          error: null,
          dashboardUrl: 'https://aistudio.google.com/app/usage',
        })
      } catch (err) {
        if (mounted) setData(prev => ({ ...prev, loading: false, error: err.message }))
      }
    }

    checkKey()
    // 1분마다 재확인 (Claude/ChatGPT와 동일 주기 - 키 없으면 main process에서 네트워크 호출 없이 즉시 반환됨)
    const id = setInterval(checkKey, 60 * 1000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  return data
}
