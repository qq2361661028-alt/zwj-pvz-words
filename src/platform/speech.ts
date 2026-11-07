/** D15：只用运行时 SpeechSynthesis，不预生成音频；不可用时静默降级 */
export function speakWord(word: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    return false
  }
}
