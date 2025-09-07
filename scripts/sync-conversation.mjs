// scripts/sync-conversation.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUB = path.join(ROOT, 'public')
const CONVO = path.join(PUB, 'content', 'conversation')

function ymd(d = new Date()) {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return t.toISOString().slice(0, 10)
}
function webPath(abs) {
  const rel = path.relative(PUB, abs).split(path.sep).join('/')
  return '/' + rel
}
async function readJsonSafe(p, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf-8'))
  } catch {
    return fallback
  }
}
async function writeJsonPretty(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf-8')
}
function countWords(s = '') {
  return (s.match(/\b[\w’'-]+\b/gi) || []).length
}
function estimateDuration(dialogue) {
  // 若對話 json 已提供，優先用
  const metaSec =
    dialogue?.estimated_duration_sec ?? dialogue?.metadata?.estimated_duration_sec ?? null

  if (typeof metaSec === 'number' && metaSec > 0) return Math.round(metaSec)

  const turns = Array.isArray(dialogue?.turns) ? dialogue.turns : []
  const words = turns.reduce((sum, t) => sum + countWords(t.en || ''), 0)
  if (!words) return 300 // fallback 5 min
  const wpm = 150
  const sec = Math.round((words / wpm) * 60)
  return Math.max(30, Math.min(1200, sec)) // 0.5–20 min 合理範圍
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

async function listDirs(base) {
  const out = []
  const entries = await fs.readdir(base, { withFileTypes: true })
  for (const e of entries) if (e.isDirectory()) out.push(path.join(base, e.name))
  return out
}
async function listJsonFiles(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (!e.isFile()) continue
    if (!e.name.toLowerCase().endsWith('.json')) continue
    if (e.name === 'manifest.json' || e.name === 'categories.json') continue
    out.push(path.join(dir, e.name))
  }
  return out
}

async function buildManifestForCategory(categoryDir, categoriesIndexMap) {
  const category = path.basename(categoryDir)
  const files = await listJsonFiles(categoryDir)

  const items = []
  for (const abs of files) {
    const djson = await readJsonSafe(abs)
    if (!djson) {
      console.warn('⚠️  無法解析 JSON，略過：', abs)
      continue
    }
    const id = djson.id || path.basename(abs, '.json')
    const item = {
      id,
      title_en: djson.title || id,
      title_zh: djson.title_zh || undefined,
      level: djson.level || undefined,
      estimated_duration_sec: estimateDuration(djson),
      speakers: Array.isArray(djson.speakers) ? djson.speakers.length : undefined,
      tags: Array.isArray(djson.tags) ? djson.tags : undefined,
      path: webPath(abs),
    }
    // 清掉 undefined
    Object.keys(item).forEach((k) => item[k] === undefined && delete item[k])
    items.push(item)
  }

  // 依 id 排序（字典序），你也可改成依 file 名、title 排序
  items.sort((a, b) => String(a.id).localeCompare(String(b.id), 'en'))

  // 嘗試從 categories.json 取本地化名稱（若存在）
  const catInfo = categoriesIndexMap.get(category) || {}
  const manifest = {
    category_id: category,
    category_name_zh: catInfo.name_zh || undefined,
    updated_at: ymd(),
    items,
  }
  Object.keys(manifest).forEach((k) => manifest[k] === undefined && delete manifest[k])

  const outPath = path.join(categoryDir, 'manifest.json')
  await writeJsonPretty(outPath, manifest)

  return { category, count: items.length }
}

async function loadCategoriesIndex() {
  const p = path.join(CONVO, 'categories.json')
  const json = await readJsonSafe(p, null)
  const map = new Map()
  if (json) {
    const arr = Array.isArray(json.categories)
      ? json.categories
      : Array.isArray(json.items)
        ? json.items
        : []
    for (const c of arr) if (c?.id) map.set(c.id, c)
  }
  return { path: p, json, map }
}

async function updateCategoriesEstimatedCount(categoriesPath, categoriesJson, countsById) {
  if (!categoriesJson) return // 沒有 categories.json 就跳過
  const arr = Array.isArray(categoriesJson.categories)
    ? categoriesJson.categories
    : categoriesJson.items
  if (!Array.isArray(arr)) return

  for (const c of arr) {
    const id = c.id
    if (!id) continue
    const found = countsById.get(id)
    if (found != null) c.estimated_count = found
    // 同場加映：確保 manifest 路徑正確
    const expected = `/content/conversation/${id}/manifest.json`
    if (!c.manifest || c.manifest !== expected) c.manifest = expected
  }
  await writeJsonPretty(categoriesPath, categoriesJson)
}

async function main() {
  await ensureDir(CONVO)

  // 讀 categories.json（若有）
  const {
    path: categoriesPath,
    json: categoriesJson,
    map: categoriesIndexMap,
  } = await loadCategoriesIndex()

  // 找出所有分類資料夾
  const categoryDirs = await listDirs(CONVO)
  const counts = new Map()

  for (const dir of categoryDirs) {
    const { category, count } = await buildManifestForCategory(dir, categoriesIndexMap)
    counts.set(category, count)
    console.log(`✅ manifest 更新：${path.relative(ROOT, dir)}/manifest.json（${count} 篇）`)
  }

  // 更新 categories.json 的 estimated_count 與 manifest 路徑
  await updateCategoriesEstimatedCount(categoriesPath, categoriesJson, counts)

  console.log('🎉 完成 Sync：所有 manifest 與 categories.json 已更新')
}

main().catch((e) => {
  console.error('❌ 失敗：', e.message)
  process.exit(1)
})
