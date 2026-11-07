/* global console, process */
import { readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const ROOT = 'dist'
const LIMIT = 3 * 1024 * 1024
const JS_LIMIT = 500 * 1024

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const files = walk(ROOT).filter((file) => !file.endsWith('.map'))
const groups = { js: [], css: [], font: [], image: [], audio: [], other: [] }

for (const file of files) {
  const ext = extname(file)
  const size = statSync(file).size
  const row = { file: relative(ROOT, file), size }
  if (['.js', '.mjs'].includes(ext)) groups.js.push(row)
  else if (ext === '.css') groups.css.push(row)
  else if (['.woff2', '.woff'].includes(ext)) groups.font.push(row)
  else if (['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) groups.image.push(row)
  else if (['.mp3', '.ogg'].includes(ext)) groups.audio.push(row)
  else groups.other.push(row)
}

const sum = (rows) => rows.reduce((total, row) => total + row.size, 0)
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

for (const [name, rows] of Object.entries(groups)) {
  console.log(`${name.padEnd(6)} ${String(rows.length).padStart(3)} 个  ${kb(sum(rows))}`)
}

const total = sum(files.map((file) => ({ size: statSync(file).size })))
const largestJs = groups.js.reduce((max, row) => Math.max(max, row.size), 0)
console.log(`total  ${kb(total)} / 3.0 MB`)
console.log(`largest js  ${kb(largestJs)} / 500 KB`)

if (total > LIMIT) {
  console.error('首屏预算超限：dist 总计超过 3MB')
  process.exit(1)
}
if (largestJs > JS_LIMIT) {
  console.error('单个 JS chunk 超过 500KB')
  process.exit(1)
}
