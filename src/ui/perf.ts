export function summarizeFrames(
  frames: readonly number[],
  elapsedMs: number
): { fps: number; p95: number } {
  if (frames.length === 0 || elapsedMs <= 0) return { fps: 0, p95: 0 }
  const sorted = [...frames].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
  return {
    fps: Math.round((frames.length / elapsedMs) * 1000),
    p95: Math.round(sorted[index] * 10) / 10
  }
}
