import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    // 之後可放全域設定，如 tts.rate / accent 等
  }),
  actions: {},
})
