// API 호출 핸들러 — main process에서 실행 (프록시/CORS 문제 없음)
// Node.js의 https 모듈 사용, 환경변수 프록시 우회

const https = require('https')
const http = require('http')

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { headers }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        } else {
          try { resolve(JSON.parse(data)) }
          catch { reject(new Error('JSON 파싱 실패')) }
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('타임아웃')) })
  })
}

// OpenAI Usage API (신규 엔드포인트)
async function fetchChatGPTUsage(apiKey) {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')

  // 오늘 00:00 ~ 지금 (unix timestamp)
  const todayStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000)
  const weekStart  = Math.floor((now.getTime() / 1000) - 7 * 86400)
  const monthStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)
  const nowTs      = Math.floor(now.getTime() / 1000)

  const headers = { 'Authorization': `Bearer ${apiKey}` }

  // /v1/organization/costs — 날짜 범위 한 번에 조회
  const [todayData, weekData, monthData] = await Promise.all([
    httpGet(`https://api.openai.com/v1/organization/costs?start_time=${todayStart}&end_time=${nowTs}&limit=100`, headers),
    httpGet(`https://api.openai.com/v1/organization/costs?start_time=${weekStart}&end_time=${nowTs}&limit=100`, headers),
    httpGet(`https://api.openai.com/v1/organization/costs?start_time=${monthStart}&end_time=${nowTs}&limit=100`, headers),
  ])

  const sum = (data) => {
    const items = data?.data || []
    return items.reduce((acc, item) => ({
      tokens: acc.tokens + (item.input_tokens || 0) + (item.output_tokens || 0),
      cost:   acc.cost   + (item.amount?.value || 0),
    }), { tokens: 0, cost: 0 })
  }

  return {
    today: sum(todayData),
    week:  sum(weekData),
    month: sum(monthData),
  }
}

// Gemini — 공식 Usage API 없음, API 키 유효성만 확인
async function fetchGeminiStatus(apiKey) {
  const data = await httpGet(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`
  )
  // 모델 1개라도 왔으면 유효한 키
  if (data?.models?.length > 0) {
    return { valid: true, modelCount: data.models.length }
  }
  throw new Error('유효하지 않은 API 키')
}

module.exports = { fetchChatGPTUsage, fetchGeminiStatus }
