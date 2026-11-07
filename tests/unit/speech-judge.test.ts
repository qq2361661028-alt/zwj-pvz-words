import { describe, expect, it } from 'vitest'
import {
  AVAILABILITY_REASON,
  editDistance,
  judgeTranscript,
  normalizeSpeech,
  resolveAvailability
} from '../../src/rules/speechJudge'

describe('归一化', () => {
  it('trim + 小写 + 去标点 + 折叠空格', () => {
    expect(normalizeSpeech('  Sun-Flower! ')).toBe('sunflower')
    expect(normalizeSpeech('Clover.')).toBe('clover')
    expect(normalizeSpeech('ice   cream')).toBe('ice cream')
    expect(normalizeSpeech('“Thistle”')).toBe('thistle')
  })
})

describe('编辑距离', () => {
  it('插 / 删 / 换各算 1', () => {
    expect(editDistance('clover', 'clove')).toBe(1)
    expect(editDistance('sun', 'fun')).toBe(1)
    expect(editDistance('', 'moss')).toBe(4)
    expect(editDistance('moss', 'moss')).toBe(0)
  })
})

describe('§8.3 判定', () => {
  it('完全一致 → pass；大小写与标点不影响', () => {
    expect(judgeTranscript('clover', { transcript: 'clover', confidence: 0.9 })).toBe('pass')
    expect(judgeTranscript('clover', { transcript: ' Clover! ', confidence: 0.8 })).toBe('pass')
  })

  it('candidates[0..4] 任一命中即 pass，第 6 个不参与', () => {
    expect(
      judgeTranscript('fern', { transcript: 'firm', confidence: 0.9, candidates: ['firm', 'firn', 'ferm', 'furn', 'fern'] })
    ).toBe('pass')
    expect(
      judgeTranscript('fern', {
        transcript: 'firm',
        confidence: 0.9,
        candidates: ['firm', 'firn', 'ferm', 'furn', 'firm', 'fern']
      })
    ).toBe('fail')
  })

  it('len ≥ 5 允许编辑距离 1，距离 2 不接受', () => {
    expect(judgeTranscript('clover', { transcript: 'clove', confidence: 0.9 })).toBe('pass')
    expect(judgeTranscript('sunflower', { transcript: 'sunflowr', confidence: 0.9 })).toBe('pass')
    expect(judgeTranscript('clover', { transcript: 'clxxer', confidence: 0.9 })).toBe('fail')
  })

  it('len ≤ 4 必须完全一致', () => {
    expect(judgeTranscript('sun', { transcript: 'fun', confidence: 0.9 })).toBe('fail')
    expect(judgeTranscript('sun', { transcript: 'sunn', confidence: 0.9 })).toBe('fail')
    expect(judgeTranscript('moss', { transcript: 'moss', confidence: 0.9 })).toBe('pass')
  })

  it('空 transcript 或 confidence < 0.40 → no_speech', () => {
    expect(judgeTranscript('sun', { transcript: '   ', confidence: 0.9 })).toBe('no_speech')
    expect(judgeTranscript('sun', { transcript: 'fun', confidence: 0.39 })).toBe('no_speech')
    expect(judgeTranscript('sun', { transcript: 'fun', confidence: 0.4 })).toBe('fail')
  })

  it('候选命中优先于低置信度', () => {
    expect(judgeTranscript('moss', { transcript: 'moss', confidence: 0.2 })).toBe('pass')
  })

  it('说成中文不算没听清，记 fail', () => {
    expect(judgeTranscript('moss', { transcript: '苔藓', confidence: 0.9 })).toBe('fail')
  })
})

describe('§8.5 四态', () => {
  it('无识别能力优先报 unsupported，其次 insecure、denied', () => {
    expect(resolveAvailability({ hasRecognition: false, secure: true, denied: false })).toBe('unsupported')
    expect(resolveAvailability({ hasRecognition: true, secure: false, denied: false })).toBe('insecure')
    expect(resolveAvailability({ hasRecognition: true, secure: true, denied: true })).toBe('denied')
    expect(resolveAvailability({ hasRecognition: true, secure: true, denied: false })).toBe('ok')
  })

  it('四态文案与规范逐字一致', () => {
    expect(AVAILABILITY_REASON.insecure).toBe('请用 https 打开')
    expect(AVAILABILITY_REASON.unsupported).toBe('此浏览器不支持语音，请用 Chrome/Edge')
    expect(AVAILABILITY_REASON.denied).toBe('麦克风权限被拒，请点地址栏左侧图标开启')
  })
})
