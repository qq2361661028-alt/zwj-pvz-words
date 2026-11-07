import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './ui/App'
import { RAW } from './content'
import { assertContent, validateContent } from './content/validate'

function BootError({ message }: { message: string }) {
  return (
    <div className="boot-error">
      <div className="boot-error__card">
        <h1>内容校验没通过，游戏没有启动</h1>
        <p>修好下面的问题再刷新页面（D21：校验不过禁止启动）。</p>
        <pre>{message}</pre>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (!container) throw new Error('#root 不存在')

const root = createRoot(container)

try {
  assertContent(RAW)
  const { warnings } = validateContent(RAW)
  if (warnings.length) console.warn('[content] 报告（不阻断）：\n- ' + warnings.join('\n- '))
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
} catch (err) {
  root.render(<BootError message={err instanceof Error ? err.message : String(err)} />)
}
