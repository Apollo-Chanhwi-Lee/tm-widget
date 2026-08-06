import { useState, useEffect } from 'react'

/**
 * Gemini Usage Hook
 * Google AI Studio API를 통한 사용량 조회
 * 
 * 주의: Google AI Studio는 공식 Usage API가 없어서
 * 간접적으로 모델 리스트를 조회하거나, 사용자가 직접 입력한 할당량을 기준으로 추정
 * 
 * 대안: Vertex AI를 사용하면 Cloud Billing API로 정확한 사용량 조회 가능
 * 
 * 반환값:
 * {
 *   today: { tokens: number, requests: number },
 *   week: { tokens: number, requests: number },
 *   month: { tokens: number, requests: number },
 *   quota: { remaining: number, limit: number },
 *   loading: boolean,
 *   error: string | null
 * }
 */
export default function useGemini() {
  const [data, setData] = useState({
    today: { tokens: 0, requests: 0 },
    week: { tokens: 0, requests: 0 },
    month: { tokens: 0, requests: 0 },
    quota: { remaining: 0, limit: 0 },
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true
    let intervalId = null

    const fetchUsage = async () => {
      try {
        const apiKey = await window.tmAPI?.storeGet('gemini_api_key')
        
        if (!apiKey) {
          if (mounted) {
            setData(prev => ({ ...prev, loading: false, error: 'API 키 없음' }))
          }
          return
        }

        // Google AI Studio API 엔드포인트
        // 참고: Gemini는 공식 Usage API가 없음
        // 대신 models.list로 사용 가능한 모델 확인 (API 키 유효성 검증)
        const modelsRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        if (!modelsRes.ok) {
          throw new Error(`API 오류: ${modelsRes.status}`)
        }

        const modelsData = await modelsRes.json()
        
        // 실제 사용량 데이터는 없으므로 로컬 스토리지에서 불러오기
        // (앱 내에서 요청할 때마다 카운팅하는 방식으로 구현 필요)
        const cachedUsage = await window.tmAPI?.storeGet('gemini_usage') || {
          today: { tokens: 0, requests: 0 },
          week: { tokens: 0, requests: 0 },
          month: { tokens: 0, requests: 0 },
        }

        // 할당량 정보 (Google AI Studio 무료 플랜: 60 RPM)
        // 실제 할당량은 models API 응답에서 확인 불가능하므로 고정값 사용
        const quotaLimit = 60 * 60 * 24 // 일일 최대 요청 수 (60 RPM 기준)
        const quotaUsed = cachedUsage.today.requests
        const quotaRemaining = Math.max(0, quotaLimit - quotaUsed)

        if (mounted) {
          setData({
            today: cachedUsage.today,
            week: cachedUsage.week,
            month: cachedUsage.month,
            quota: {
              remaining: quotaRemaining,
              limit: quotaLimit,
            },
            loading: false,
            error: null,
          })
        }
      } catch (err) {
        console.error('[useGemini] fetch error:', err)
        if (mounted) {
          setData(prev => ({ 
            ...prev, 
            loading: false, 
            error: err.message.includes('400') || err.message.includes('401') 
              ? 'API 키 오류' 
              : err.message 
          }))
        }
      }
    }

    // 초기 로드
    fetchUsage()

    // 30분마다 갱신
    intervalId = setInterval(fetchUsage, 30 * 60 * 1000)

    return () => {
      mounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return data
}

/**
 * Gemini 사용량 기록 헬퍼 함수
 * (실제 앱에서 Gemini API 호출 후 이 함수를 호출해 사용량 누적)
 * 
 * @param {number} tokens - 사용한 토큰 수
 */
export async function recordGeminiUsage(tokens = 0) {
  const now = new Date()
  const todayKey = formatDate(now)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const usage = await window.tmAPI?.storeGet('gemini_usage') || {
    today: { tokens: 0, requests: 0 },
    week: { tokens: 0, requests: 0 },
    month: { tokens: 0, requests: 0 },
    lastUpdated: todayKey,
  }

  // 날짜가 바뀌면 오늘 사용량 리셋
  if (usage.lastUpdated !== todayKey) {
    usage.today = { tokens: 0, requests: 0 }
    usage.lastUpdated = todayKey
  }

  // 사용량 누적
  usage.today.tokens += tokens
  usage.today.requests += 1
  usage.week.tokens += tokens
  usage.week.requests += 1
  usage.month.tokens += tokens
  usage.month.requests += 1

  await window.tmAPI?.storeSet('gemini_usage', usage)
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
