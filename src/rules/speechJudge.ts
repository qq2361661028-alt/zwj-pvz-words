export type SpeechAvailability = 'ok' | 'insecure' | 'unsupported' | 'denied'
export type SpeechVerdict = 'pass' | 'fail' | 'no_speech' | 'error'

export type SpeechResult = {
  verdict: SpeechVerdict
  transcript: string
  confidence: number
  candidates: string[]
}

export type SpeechInput = {
  transcript: string
  confidence: number
  candidates?: readonly string[]
}

export const AVAILABILITY_REASON: Record<Exclude<SpeechAvailability, 'ok'>, string> = {
  insecure: '请用 https 打开',
  unsupported: '此浏览器不支持语音，请用 Chrome/Edge',
  denied: '麦克风权限被拒，请点地址栏左侧图标开启'
}

export function resolveAvailability(input: {
  hasRecognition: boolean
  secure: boolean
  denied: boolean
}): SpeechAvailability {
  if (!input.hasRecognition) return 'unsupported'
  if (!input.secure) return 'insecure'
  if (input.denied) return 'denied'
  return 'ok'
}

/** §8.3 第 1 步：trim + 小写 + 去标点 + 折叠空格 */
export function normalizeSpeech(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = cur
  }
  return prev[b.length]
}

/** §8.3：顺序固定；pass 判定先于 no_speech 阈值（ASR 置信度为 0 时仍可能读对） */
export function judgeTranscript(expect: string, input: SpeechInput): SpeechVerdict {
  const target = normalizeSpeech(expect)
  const pool = (input.candidates?.length ? input.candidates : [input.transcript])
    .slice(0, 5)
    .map(normalizeSpeech)

  if (pool.some((c) => c.length > 0 && c === target)) return 'pass'
  if (target.length >= 5 && pool.some((c) => c.length > 0 && editDistance(c, target) <= 1)) return 'pass'
  if (input.transcript.trim() === '' || input.confidence < 0.4) return 'no_speech'
  return 'fail'
}
