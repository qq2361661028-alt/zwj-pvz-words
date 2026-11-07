import { useState } from 'react'
import { loadSave, persistSave } from '../platform/save'
import { Button } from './Button'

type Props = { onClose: () => void }

export function SettingsOverlay({ onClose }: Props) {
  const [save, setSave] = useState(() => loadSave())

  const toggleSpeech = () => {
    const next = {
      ...save,
      settings: { ...save.settings, speech_enabled: !save.settings.speech_enabled }
    }
    setSave(next)
    persistSave(next)
  }

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
