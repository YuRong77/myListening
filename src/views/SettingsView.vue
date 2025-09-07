<template>
  <section class="wrap">
    <h1>設置</h1>

    <div class="card">
      <h2>語音設定</h2>

      <div class="row">
        <label>口音（Accent）</label>
        <select :value="tts.accent" @change="onAccentChange">
          <option value="en-US">🇺🇸 English (US)</option>
          <option value="en-GB">🇬🇧 English (UK)</option>
          <option value="en-AU">🇦🇺 English (AU)</option>
          <option value="en-CA">🇨🇦 English (CA)</option>
        </select>
      </div>

      <div class="row">
        <label>語速（Rate）</label>
        <input type="range" min="0.5" max="1.5" step="0.05" :value="tts.rate"
          @input="e => tts.setRate(e.target.value)" />
        <span class="value">{{ tts.rate.toFixed(2) }}</span>
      </div>

      <div class="row">
        <label>Speaker A 聲音</label>
        <select :value="tts.voiceA" @change="e => tts.setVoiceA(e.target.value)">
          <option v-for="v in voiceOptions" :key="'A-' + v.name" :value="v.name">
            {{ v.name }} ({{ v.lang }})
          </option>
          <option v-if="voiceOptions.length === 0" disabled>（無可用音色）</option>
        </select>
        <button class="btn" @click="tts.speak(sampleA, 'A')">測試 A</button>
      </div>

      <div class="row">
        <label>Speaker B 聲音</label>
        <select :value="tts.voiceB" @change="e => tts.setVoiceB(e.target.value)">
          <option v-for="v in voiceOptions" :key="'B-' + v.name" :value="v.name">
            {{ v.name }} ({{ v.lang }})
          </option>
          <option v-if="voiceOptions.length === 0" disabled>（無可用音色）</option>
        </select>
        <button class="btn" @click="tts.speak(sampleB, 'B')">測試 B</button>
      </div>

      <p class="hint" v-if="!tts.ready">
        正在載入可用語音… 若清單為空，請點擊頁面任意處或重整（部分瀏覽器需互動才載入 voices）。
      </p>
      <p class="hint">
        小提醒：行動版 Safari / iOS 通常需要「使用者互動」後才允許語音播放；不同瀏覽器/系統提供的可用音色也會不同。
      </p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useTtsStore } from '@/stores/tts';

const tts = useTtsStore();

const sampleA = "Hello, this is Speaker A. How are you today?";
const sampleB = "Hi there, I'm Speaker B. Let's start our dialogue.";

const voiceOptions = computed(() => {
  // 以選擇口音優先顯示；若該口音沒有任何聲音，退回所有英文音色
  const list = tts.voicesForAccent;
  return (list.length ? list : tts.allEnglishVoices).map(v => ({
    name: v.name,
    lang: v.lang
  }));
});

function onAccentChange(e) {
  tts.setAccent(e.target.value);
}

onMounted(async () => {
  if (!('speechSynthesis' in window)) {
    alert('此瀏覽器不支援 Web Speech Synthesis API。請改用 Chrome/Edge/Safari 等新版瀏覽器。');
    return;
  }
  await tts.init();
});
</script>

<style scoped>
.wrap {
  max-width: 960px;
  margin: 0 auto;
}

h1 {
  margin: 0 0 12px;
  font-size: 22px;
}

.card {
  background: #11182d;
  border: 1px solid #1f2a44;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .25);
}

h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.row {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.row label {
  color: #c8d3e0;
}

.row select,
.row input[type="range"] {
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #25304d;
  background: #0e1427;
  color: #e7ecf5;
}

.value {
  min-width: 48px;
  text-align: right;
  color: #93a0b5;
}

.btn {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #2a3a6b;
  background: #192653;
  color: #e7ecf5;
  cursor: pointer;
}

.btn:hover {
  filter: brightness(1.1);
}

.hint {
  color: #93a0b5;
  font-size: 13px;
}
</style>
