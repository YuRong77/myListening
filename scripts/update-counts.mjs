// scripts/update-counts.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const convoDir = path.join(root, 'public', 'content', 'conversation')
const categoriesPath = path.join(convoDir, 'categories.json')

function safeArray(v) {
  if (Array.isArray(v)) return v
  if (v && Array.isArray(v.items)) return v.items
  return []
}

async function main() {
  const raw = await fs.readFile(categoriesPath, 'utf-8')
  const json = JSON.parse(raw)
  const categories = Array.isArray(json.categories) ? json.categories : json.items

  if (!Array.isArray(categories)) {
    throw new Error('categories.json 格式錯誤：缺少 categories/items 陣列')
  }

  const updated = await Promise.all(
    categories.map(async (c) => {
      const manifest = c.manifest
      if (!manifest) return { ...c, estimated_count: c.estimated_count ?? 0 }

      // 將 /content/... 轉成實體路徑
      const manifestFsPath = path.join(root, 'public', manifest.replace(/^\/+/, ''))
      try {
        const mraw = await fs.readFile(manifestFsPath, 'utf-8')
        const mjson = JSON.parse(mraw)
        const items = Array.isArray(mjson.items) ? mjson.items : []
        return { ...c, estimated_count: items.length }
      } catch (e) {
        console.warn('讀取 manifest 失敗：', manifest, e.message)
        return { ...c, estimated_count: c.estimated_count ?? 0 }
      }
    }),
  )

  const out = Array.isArray(json.categories)
    ? { ...json, categories: updated }
    : { ...json, items: updated }

  await fs.writeFile(categoriesPath, JSON.stringify(out, null, 2), 'utf-8')
  console.log('✅ categories.json 已更新 estimated_count')
}

main().catch((e) => {
  console.error('❌ 更新失敗：', e)
  process.exit(1)
})
