import {
  judgeTranscript,
  resolveAvailability,
  type SpeechAvailability,
  type SpeechResult
} from '../rules/speechJudge'

export type RecognizeOptions = { timeoutMs: number }

export interface SpeechProvider {
  available(): SpeechAvailability
  recognize(expect: string, opts: RecognizeOptions): Promise<SpeechResult>
  refreshPermission?(): Promise<SpeechAvailability>
}

type Alternative = { transcript?: string; confidence?: number }
type RecognitionResult = { length: number; [index: number]: Alternative }
type RecognitionEvent = { results?: { length: number; [index: number]: RecognitionResult } }
type RecognitionErrorEvent = { error?: string }

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type RecognitionCtor = new () => RecognitionLike

const emptyResult = (verdict: SpeechResult['verdict']): SpeechResult => ({
  verdict,
  transcript: '',
  confidence: 0,
  candidates: []
})

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export class NoopProvider implements SpeechProvider {
  available(): SpeechAvailability {
    return 'unsupported'
  }
  async recognize(_expect: string, _opts: RecognizeOptions): Promise<SpeechResult> {
    return emptyResult('error')
  }
}

export class WebSpeechProvider implements SpeechProvider {
  private denied = false

  available(): SpeechAvailability {
    const secure = typeof window === 'undefined' ? false : window.isSecureContext
    return resolveAvailability({
      hasRecognition: getCtor() !== undefined,
      secure,
      denied: this.denied
    })
  }

  async refreshPermission(): Promise<SpeechAvailability> {
    try {
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        const status = await navigator.permissions.query({
          name: 'microphone' as PermissionName
        })
        this.denied = status.state === 'denied'
      }
    } catch {
      // 部分浏览器不支持 microphone 查询：保持现有状态
    }
    return this.available()
  }

  recognize(expect: string, opts: RecognizeOptions): Promise<SpeechResult> {
    return new Promise((resolve) => {
      const Ctor = getCtor()
      if (!Ctor) {
        resolve(emptyResult('error'))
        return
      }

      const rec = new Ctor()
      rec.lang = 'en-US'
      rec.continuous = false
      rec.interimResults = false
      rec.maxAlternatives = 5

      let done = false
      const finish = (result: SpeechResult) => {
        if (done) return
        done = true
        globalThis.clearTimeout(timer)
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        try {
          rec.abort()
        } catch {
          // 已经停止
        }
        resolve(result)
      }

      const timer = globalThis.setTimeout(() => finish(emptyResult('no_speech')), opts.timeoutMs)

      rec.onresult = (event) => {
        const first = event.results?.[0]
        if (!first || first.length === 0) {
          finish(emptyResult('no_speech'))
          return
        }
        const alternatives: Alternative[] = []
        for (let i = 0; i < first.length && i < 5; i++) {
          alternatives.push({
            transcript: String(first[i]?.transcript ?? ''),
            confidence: Number(first[i]?.confidence ?? 0)
          })
        }
        const transcript = alternatives[0].transcript ?? ''
        const confidence = alternatives[0].confidence ?? 0
        const candidates = alternatives.map((a) => a.transcript ?? '')
        finish({
          verdict: judgeTranscript(expect, { transcript, confidence, candidates }),
          transcript,
          confidence,
          candidates
        })
      }

      rec.onerror = (event) => {
        const code = event.error ?? ''
        if (code === 'not-allowed' || code === 'service-not-allowed') this.denied = true
        finish(emptyResult(code === 'no-speech' || code === 'aborted' ? 'no_speech' : 'error'))
      }

      rec.onend = () => finish(emptyResult('no_speech'))

      try {
        rec.start()
      } catch {
        finish(emptyResult('error'))
      }
    })
  }
}

export function createSpeechProvider(): SpeechProvider {
  return getCtor() ? new WebSpeechProvider() : new NoopProvider()
}
