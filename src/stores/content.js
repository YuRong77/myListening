// src/stores/content.js
import { defineStore } from 'pinia'
import { withBase } from '@/utils/base-url'

export const useContentStore = defineStore('content', {
  state: () => ({
    categories: [],
    loading: false,
    error: null,
    lastLoadedAt: 0,

    manifests: {},
    manifestLoading: false,
    manifestError: null,
  }),
  actions: {
    async loadCategories(force = false) {
      if (this.loading) return
      if (!force && this.categories.length > 0) return

      this.loading = true
      this.error = null
      try {
        const res = await fetch(
          // ✅ 這裡要用 withBase，因為是硬字串路徑
          (await import('@/utils/base-url')).withBase('content/conversation/categories.json'),
          { headers: { 'Cache-Control': 'no-cache' } },
        )
        const data = await res.json()
        const cats = Array.isArray(data.categories)
          ? data.categories
          : Array.isArray(data.items)
            ? data.items
            : []
        // ✅ 保留 JSON 裡的 manifest 原樣，不在這一步先加 base
        this.categories = cats
        this.lastLoadedAt = Date.now()
      } catch (err) {
        this.error = err?.message || String(err)
        this.categories = []
      } finally {
        this.loading = false
      }
    },

    async loadManifest(category) {
      const id = category.id || category.category_id
      // ✅ 無論 JSON 裡是 '/content/...' 或已是 '/myListening/content/...'
      //    withBase() 會自動處理且不重複加
      const manifestPath = withBase(category.manifest || `content/conversation/${id}/manifest.json`)

      // ... fetch manifestPath ...
      const r = await fetch(manifestPath, { headers: { 'Cache-Control': 'no-cache' } })
      const json = await r.json()
      const items = Array.isArray(json.items) ? json.items : json.dialogues || []

      // ✅ 每個 item.path 也只在這裡補一次 base
      const itemsWithBase = items.map((it) => ({
        ...it,
        path: withBase(it.path || `content/conversation/${id}/${it.id}.json`),
      }))

      const pack = { items: itemsWithBase, updated_at: json.updated_at || '', manifestPath }
      this.manifests[id] = pack
      return pack
    },
  },
})
