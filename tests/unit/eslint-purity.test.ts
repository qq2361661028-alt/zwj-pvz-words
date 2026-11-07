import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dir = join(process.cwd(), 'src', 'rules')
const files = readdirSync(dir).filter((f) => f.endsWith('.ts'))

const FORBIDDEN: Array<{ re: RegExp; why: string }> = [
  { re: /from\s+['"](react|react-dom|phaser)/, why: 'D3：规则层不得依赖渲染层' },
  { re: /Math\.random\s*\(/, why: 'D10：禁止 Math.random' },
  { re: /Date\.now\s*\(/, why: 'D10：禁止读当前时间' },
  { re: /new\s+Date\s*\(/, why: 'D10：禁止读当前时间' },
  { re: /\b(window|document|localStorage)\b/, why: 'D3：规则层不得触碰 DOM / 存储' },
  { re: /from\s+['"][^'"]*(?:content|ui|art|game)[^'"]*['"]/, why: 'D3：规则层不得直接读内容或渲染模块' }
]

describe('规则层纯度（ESLint 守卫的程序化备份）', () => {
  it('src/rules 下所有源文件不含禁用 API', () => {
    expect(files.length).toBeGreaterThanOrEqual(10)
    for (const file of files) {
      const src = readFileSync(join(dir, file), 'utf8')
      for (const rule of FORBIDDEN) {
        expect(rule.re.test(src), `${file} 违反 ${rule.why}`).toBe(false)
      }
    }
  })
})
