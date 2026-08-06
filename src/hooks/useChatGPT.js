import { useState, useEffect } from 'react'

/**
 * ChatGPT Usage Hook
 * OpenAI Usage API: https://platform.openai.com/docs/api-reference/usage
 * 
 * 반환값:
 * {
 *   today: { tokens: number, cost: number },
 *   week: { tokens: number, cost: number },
 *   month: { tokens: number, cost: number },
 *   loading: boolean,
 *   error: string | null
 * }
 */
export default function useChatGPT() {
  const [data, setData] = useState({
    today: { tokens: 0, cost: 0 },
    week: { tokens: 0, cost: 0 },
    month: { tokens: 0, cost: 0 },
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true
    let intervalId = null

    const fetchUsage = async () => {
      try {
        const apiKey = await window.tmAPI?.storeGet('chatgpt_api_key')
        
        if (!apiKey) {
          if (mounted) {
            setData(prev => ({ ...prev, loading: false, error: 'API 키 없음' }))
          }
          return
        }

        // 날짜 계산
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        // OpenAI Usage API 호출
        // GET https://api.openai.com/v1/usage?date={YYYY-MM-DD}
        // 또는 GET https://api.openai.com/v1/organization/usage
        
        const headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }

        // 오늘 사용량
        const todayRes = await fetch(
          `https://api.openai.com/v1/usage?date=${formatDate(todayStart)}`,
          { headers }
        )
        
        if (!todayRes.ok) {
          throw new Error(`API 오류: ${todayRes.status}`)
        }

        const todayData = await todayRes.json()
        
        // 주간 사용량 (최근 7일)
        const weekPromises = []
        for (let i = 0; i < 7; i++) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          weekPromises.push(
            fetch(`https://api.openai.com/v1/usage?date=${formatDate(date)}`, { headers })
              .then(r => r.json())
          )
        }
        const weekDataArray = await Promise.all(weekPromises)
        
        // 월간 사용량 (이번 달)
        const daysInMonth = now.getDate()
        const monthPromises = []
        for (let i = 0; i < daysInMonth; i++) {
          const date = new Date(now.getFullYear(), now.getMonth(), i + 1)
          monthPromises.push(
            fetch(`https://api.openai.com/v1/usage?date=${formatDate(date)}`, { headers })
              .then(r => r.json())
          )
        }
        const monthDataArray = await Promise.all(monthPromises)

        if (mounted) {
          setData({
            today: calculateUsage(todayData),
            week: calculateUsage(weekDataArray),
            month: calculateUsage(monthDataArray),
            loading: false,
            error: null,
          })
        }
      } catch (err) {
        console.error('[useChatGPT] fetch error:', err)
        if (mounted) {
          setData(prev => ({ ...prev, loading: false, error: err.message }))
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

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 사용량 데이터 집계
function calculateUsage(rawData) {
  // rawData가 배열이면 합산, 단일 객체면 그대로
  const dataArray = Array.isArray(rawData) ? rawData : [rawData]
  
  let totalTokens = 0
  let totalCost = 0

  dataArray.forEach(item => {
    if (!item || !item.data) return
    
    // OpenAI Usage API 응답 구조:
    // {
    //   "data": [
    //     {
    //       "aggregation_timestamp": 1234567890,
    //       "n_requests": 100,
    //       "operation": "completion",
    //       "snapshot_id": "...",
    //       "n_context_tokens_total": 50000,
    //       "n_generated_tokens_total": 5000
    //     }
    //   ]
    // }
    
    item.data.forEach(record => {
      const contextTokens = record.n_context_tokens_total || 0
      const generatedTokens = record.n_generated_tokens_total || 0
      totalTokens += contextTokens + generatedTokens
      
      // 비용 추정 (GPT-4 기준: $0.03/1K input, $0.06/1K output)
      // 실제로는 모델별로 다르므로 평균값 사용
      totalCost += (contextTokens * 0.00003) + (generatedTokens * 0.00006)
    })
  })

  return {
    tokens: Math.round(totalTokens),
    cost: totalCost,
  }
}
