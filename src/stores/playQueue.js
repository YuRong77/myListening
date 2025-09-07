// src/stores/playQueue.js
import { defineStore } from 'pinia'

export const usePlayQueue = defineStore('playQueue', {
  state: () => ({
    items: [], // [{categoryId, dialogueId, title, path}]
    index: 0,
    speakTitleFirst: true,
  }),
  getters: {
    hasNext: (s) => s.index < s.items.length - 1,
    current: (s) => s.items[s.index] || null,
  },
  actions: {
    setQueue(items = [], opts = {}) {
      this.items = items
      this.index = 0
      if (typeof opts.speakTitleFirst === 'boolean') this.speakTitleFirst = opts.speakTitleFirst
    },
    clear() {
      this.items = []
      this.index = 0
    },
    next() {
      if (this.hasNext) {
        this.index += 1
        return this.items[this.index]
      }
      return null
    },
  },
})
