import { useState } from 'react'
import type { SaveData } from '../rules/stats'
import { loadSave, persistSave } from '../platform/save'
import { music } from '../platform/music'
import { Button } from './Button'

type Props = { onClose: () => void }

export function SettingsOverlay({ onClose }: Props) {
  const [save, setSave] = useState(() => loadSave())

  const patch = (value: Partial<SaveData['settings']>) => {
    const next = { ...save, settings: { ...save.settings, ...value } }
    setSave(next)
    persistSave(next)
  }

  const toggleSpeech = () => patch({ speech_enabled: !save.settings.speech_enabled })
  const toggleSound = () => patch({ sound_enabled: !save.settings.sound_enabled })
  const toggleMusic = () => {
    const value = !save.settings.music_enabled
    patch({ music_enabled: value })
    music.setEnabled(value)
  }
  const setPenalty = (ms: number) => patch({ penalty_disable_ms: ms })

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="设置">
      <div className="settings wood">
        <h2 className="settings__title display">设置</h2>

        <div className="settings__row">
          <div>
            <div className="settings__label">拼错时朗读单词</div>
            <div className="settings__sub">连错 2 次时用浏览器语音读一遍（TTS）</div>
          </div>
          <button
            type="button"
            className={`settings__toggle ${save.settings.speech_enabled ? 'is-on' : ''}`}
            aria-pressed={save.settings.speech_enabled}
            onClick={toggleSpeech}
          >
            {save.settings.speech_enabled ? '已开启' : '已关闭'}
          </button>
        </div>

        <div className="settings__row">
          <div>
            <div className="settings__label">音效</div>
            <div className="settings__sub">填对、种植、产阳光和僵尸倒下时的短音效</div>
          </div>
          <button
            type="button"
            className={`settings__toggle ${save.settings.sound_enabled ? 'is-on' : ''}`}
            aria-pressed={save.settings.sound_enabled}
            onClick={toggleSound}
          >
            {save.settings.sound_enabled ? '已开启' : '已关闭'}
          </button>
        </div>

        <div className="settings__row">
          <div>
            <div className="settings__label">背景音乐</div>
            <div className="settings__sub">关卡、战斗、图鉴和结算界面的循环配乐</div>
          </div>
          <button
            type="button"
            className={`settings__toggle ${save.settings.music_enabled ? 'is-on' : ''}`}
            aria-pressed={save.settings.music_enabled}
            onClick={toggleMusic}
          >
            {save.settings.music_enabled ? '已开启' : '已关闭'}
          </button>
        </div>

        <div className="settings__row">
          <div>
            <div className="settings__label">拼错字母冻结</div>
            <div className="settings__sub">点错后该字母块暂时不能点；0 秒适合已经熟练的孩子</div>
          </div>
          <span className="settings__seg" role="group" aria-label="拼错字母冻结时长">
            {[0, 1000, 2000].map((ms) => (
              <button
                key={ms}
                type="button"
                className={save.settings.penalty_disable_ms === ms ? 'is-on' : ''}
                aria-pressed={save.settings.penalty_disable_ms === ms}
                onClick={() => setPenalty(ms)}
              >
                {ms / 1000} 秒
              </button>
            ))}
          </span>
        </div>

        <div className="settings__privacy">
          <div className="settings__label">语音与隐私</div>
          <p>
            本游戏没有自己的服务器，也不保存任何录音。点「跟读加成」时，浏览器会把麦克风音频发到它自己的语音识别服务（Chrome 会发往 Google）。填词主玩法不需要联网也能玩。
          </p>
          <p>
            跟读功能需要 Chrome / Edge 桌面版或 Android Chrome，并通过 https 或本机地址打开；iPad Safari 不支持语音识别。
          </p>
        </div>

        <div className="settings__actions">
          <Button variant="leaf" onClick={onClose}>知道啦</Button>
        </div>
      </div>
    </div>
  )
}
