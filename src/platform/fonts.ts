export async function waitForFonts(
  doc: Pick<Document, 'fonts'> = document,
  timeoutMs = 1500
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  try {
    const ready = Promise.all([
      doc.fonts.load('400 16px "Luckiest Guy"'),
      doc.fonts.load('700 16px "Nunito Variable"'),
      doc.fonts.load('900 16px "Nunito Variable"')
    ])
      .then(() => doc.fonts.ready)
      .then(() => true)
    return await Promise.race([ready, timeout])
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
