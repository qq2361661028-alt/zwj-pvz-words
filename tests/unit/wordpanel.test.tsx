import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WordPanel } from '../../src/ui/WordPanel'
import type { Card, WordDef } from '../../src/rules/types'

const card: Card = {
  instanceId: 1,
  wordId: 'w-cat',
  plantId: 'p-sprout',
  theme: 'plant',
  slots: ['c', 'a', 't'],
  filled: 1,
  status: 'filling',
  assisted: false,
  tiles: [
    { tileId: 0, letter: 'c', used: true, disabledUntil: 0 },
    { tileId: 1, letter: 'x', used: false, disabledUntil: 0 }
  ],
  wrongStreak: 0,
  wrongTotal: 0,
  ladderLevel: 0,
  voiceBuffed: false
}

const word: WordDef = {
  id: 'w-cat',
  word: 'cat',
  zh: '猫',
  ipa: '/kæt/',
  grade: 1,
  unit: 'unit-1',
  letters: 3
}

function render(speechEnabled: boolean, onSpeak: () => void = () => {}) {
  return renderToStaticMarkup(
    <WordPanel
      card={card}
      word={word}
      now={0}
      plantName="阳光苗"
      shakeKey={0}
      voice={{ availability: 'ok', listening: false, onVoice: () => {} }}
      speechEnabled={speechEnabled}
      onSpeak={onSpeak}
      onTile={() => {}}
      onCollapse={() => {}}
      onReopen={() => {}}
      open
    />
  )
}

function speakButton(html: string) {
  return html.match(/<button[^>]*class="wordpanel__speak"[^>]*>/)?.[0] ?? ''
}

describe('WordPanel 朗读按钮', () => {
  it('朗读开启时可点击，并提示朗读单词', () => {
    const button = speakButton(render(true))
    expect(button).toContain('aria-label="朗读单词"')
    expect(button).toContain('title="朗读单词"')
    expect(button).not.toContain('disabled')
  })

  it('朗读关闭时禁用，并提示去设置里打开', () => {
    const button = speakButton(render(false))
    expect(button).toContain('disabled')
    expect(button).toContain('title="在设置里打开朗读"')
  })
})