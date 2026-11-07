import { RAW } from '../src/content/index'
import { validateContent } from '../src/content/validate'
import { validateAssets } from './validate-assets'

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

const assetIssues = validateAssets(RAW)
assetIssues.forEach((issue) => console.error(`- ${issue}`))
if (assetIssues.length) {
  process.exitCode = 1
} else {
  console.log(`资产校验通过：${(RAW.plants.length + RAW.zombies.length) * 3} 张角色图`)
}
