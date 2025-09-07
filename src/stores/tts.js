// src/stores/tts.js
import { defineStore } from 'pinia'

const LS_KEY = 'toeic-tts-settings-v1'

function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {}
}

function getVoicesOnce() {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    let voices = synth.getVoices()
    if (voices && voices.length) {
      resolve(voices)
      return
    }
    const handler = () => {
      voices = synth.getVoices()
      resolve(voices || [])
      synth.removeEventListener?.('voiceschanged', handler)
      // Safari 可能沒有 removeEventListener
      if ('onvoiceschanged' in synth) synth.onvoiceschanged = null
    }
    // 兩種事件方式做保險
    synth.addEventListener?.('voiceschanged', handler)
    if ('onvoiceschanged' in synth) synth.onvoiceschanged = handler
    // 觸發一次以便載入
    synth.getVoices()
    // 再設一個超時保底
    setTimeout(handler, 1200)
  })
}

function pickTwoDistinct(voices, langPrefix) {
  const primary = voices.filter((v) => v.lang?.startsWith(langPrefix))
  // 嘗試同口音下挑兩個不同 name
  const uniqByName = []
  const seen = new Set()
  for (const v of primary) {
    if (!seen.has(v.name)) {
      uniqByName.push(v)
      seen.add(v.name)
    }
  }
  if (uniqByName.length >= 2) return [uniqByName[0], uniqByName[1]]
  if (uniqByName.length === 1) {
    // 不足兩個就補英語其他口音
    const backup = voices.filter((v) => v.lang?.startsWith('en-') && v.name !== uniqByName[0].name)
    if (backup.length) return [uniqByName[0], backup[0]]
    return [uniqByName[0], uniqByName[0]]
  }
  // 沒有該口音時，退回任一英語
  const anyEn = voices.filter((v) => v.lang?.startsWith('en-'))
  if (anyEn.length >= 2) return [anyEn[0], anyEn[1]]
  if (anyEn.length === 1) return [anyEn[0], anyEn[0]]
  // 最後保底全語系任意兩個
  if (voices.length >= 2) return [voices[0], voices[1]]
  if (voices.length === 1) return [voices[0], voices[0]]
  return [null, null]
}

export const useTtsStore = defineStore('tts', {
  state: () => ({
    rate: 1.0,
    accent: 'en-US', // 'en-US' | 'en-GB' | 'en-AU' | 'en-CA'
    voiceA: '', // voice.name 做為 id
    voiceB: '',
    voices: [], // SpeechSynthesisVoice[]
    ready: false,
  }),
  getters: {
    // 依口音過濾可選音色
    voicesForAccent(state) {
      return state.voices.filter((v) => v.lang?.startsWith(state.accent))
    },
    allEnglishVoices(state) {
      return state.voices.filter((v) => v.lang?.startsWith('en-'))
    },
  },
  actions: {
    async init() {
      const persisted = loadPersisted()
      if (persisted) {
        this.rate = persisted.rate ?? 1.0
        this.accent = persisted.accent ?? 'en-US'
        this.voiceA = persisted.voiceA ?? ''
        this.voiceB = persisted.voiceB ?? ''
      }
      await this.refreshVoices() // 會自動挑預設 voiceA/voiceB
      this.ready = true
      persist(this.$state)
    },
    async refreshVoices() {
      const list = await getVoicesOnce()
      this.voices = list || []
      // 若尚未指定或找不到先前的 voice，依目前口音挑兩個
      const currentA = this.voices.find((v) => v.name === this.voiceA)
      const currentB = this.voices.find((v) => v.name === this.voiceB)
      if (!currentA || !currentB) {
        const [v1, v2] = pickTwoDistinct(this.voices, this.accent)
        if (v1) this.voiceA = v1.name
        if (v2) this.voiceB = v2.name
      }
      persist(this.$state)
    },
    setRate(val) {
      this.rate = Number(val) || 1.0
      persist(this.$state)
    },
    setAccent(val) {
      this.accent = val
      // 口音切換時，重新挑兩個不同人聲（但盡量保留既有設定）
      const [v1, v2] = pickTwoDistinct(this.voices, this.accent)
      if (v1) this.voiceA = v1.name
      if (v2) this.voiceB = v2.name
      persist(this.$state)
    },
    setVoiceA(name) {
      this.voiceA = name
      persist(this.$state)
    },
    setVoiceB(name) {
      this.voiceB = name
      persist(this.$state)
    },
    speak(text, which = 'A') {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      const synth = window.speechSynthesis
      const u = new SpeechSynthesisUtterance(text)
      u.rate = this.rate
      const targetName = which === 'B' ? this.voiceB : this.voiceA
      const voice =
        this.voices.find((v) => v.name === targetName) ||
        this.voices.find((v) => v.lang?.startsWith(this.accent)) ||
        this.voices.find((v) => v.lang?.startsWith('en-')) ||
        this.voices[0]
      if (voice) u.voice = voice
      u.lang = voice?.lang || this.accent || 'en-US'
      synth.cancel() // 保證測試時立即播放最新一句
      synth.speak(u)
    },
    cancel() {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
    },
    getVoice(which = 'A') {
      const targetName = which === 'B' ? this.voiceB : this.voiceA
      const picked =
        this.voices.find((v) => v.name === targetName) ||
        this.voices.find((v) => v.lang?.startsWith(this.accent)) ||
        this.voices.find((v) => v.lang?.startsWith('en-')) ||
        this.voices[0]
      return picked || null
    },

    speak(text, which = 'A', opts = {}) {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      const synth = window.speechSynthesis
      const u = new SpeechSynthesisUtterance(text)
      u.rate = this.rate
      const voice = this.getVoice(which)
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      } else {
        u.lang = this.accent || 'en-US'
      }
      if (opts.onend) u.onend = opts.onend
      if (opts.onstart) u.onstart = opts.onstart
      if (opts.onerror) u.onerror = opts.onerror

      synth.cancel()
      synth.speak(u)
    },
  },
})
