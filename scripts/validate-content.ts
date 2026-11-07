import { RAW } from '../src/content/index'
import { validateContent } from '../src/content/validate'

const report = validateContent(RAW)
report.warnings.forEach((warning) => console.warn(`warning: ${warning}`))

if (report.errors.length) {
  console.error(`D21 内容校验失败（${report.errors.length} 项）：`)
  report.errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    `内容校验通过：${RAW.plants.length} 植物 / ${RAW.words.length} 词 / ${RAW.decks.length} 配对 / ${RAW.zombies.length} 僵尸 / ${RAW.levels.length} 关`
  )
}
