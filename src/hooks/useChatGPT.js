import { useState, useEffect } from 'react'

/**
 * ChatGPT Usage Hook
 * API 호출은 main process에서 실행 (프록시/CORS 문제 없음)
 */
export default function useChatGPT() {
  const [data, setData] = useState({
    today: { tokens: 0, cost: 0 },
    week:  { tokens: 0, cost: 0 },
    month: { tokens: 0, cost: 0 },
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    const fetchUsage = async () => {
      try {
        const result = await window.tmAPI?.fetchChatGPTUsage()
        if (!mounted) return

        if (result?.error) {
          setData(prev => ({ ...prev, loading: false, error: result.error }))
          return
        }

        setData({
          today: result.today || { tokens: 0, cost: 0 },
          week:  result.week  || { tokens: 0, cost: 0 },
          month: result.month || { tokens: 0, cost: 0 },
          loading: false,
          error: null,
        })
      } catch (err) {
        if (mounted) setData(prev => ({ ...prev, loading: false, error: err.message }))
      }
    }

    fetchUsage()
    // 30분마다 갱신
    const id = setInterval(fetchUsage, 30 * 60 * 1000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  return data
}
