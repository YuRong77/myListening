// src/stores/content.js
import { defineStore } from 'pinia'

export const useContentStore = defineStore('content', {
  state: () => ({
    categories: [],
    loading: false,
    error: null,
    lastLoadedAt: 0,

    manifests: {}, // { [categoryId]: { items: [], updated_at: string, manifestPath: string } }
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
        const res = await fetch('/content/conversation/categories.json', {
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        this.categories = Array.isArray(data.categories)
          ? data.categories
          : Array.isArray(data.items)
            ? data.items
            : []
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
      const manifestPath = category.manifest || `/content/conversation/${id}/manifest.json`

      // 已載入就直接回傳
      if (this.manifests[id]?.items?.length) {
        return this.manifests[id]
      }

      this.manifestLoading = true
      this.manifestError = null
      try {
        const r = await fetch(manifestPath, { headers: { 'Cache-Control': 'no-cache' } })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json = await r.json()
        const items = Array.isArray(json.items) ? json.items : json.dialogues || []
        const pack = { items, updated_at: json.updated_at || '', manifestPath }
        this.manifests[id] = pack
        return pack
      } catch (e) {
        this.manifestError = e?.message || String(e)
        throw e
      } finally {
        this.manifestLoading = false
      }
    },
  },
})
