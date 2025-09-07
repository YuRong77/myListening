<template>
  <section class="wrap" v-if="supported">
    <header class="head">
      <div>
        <h1>{{ data?.title || dialogueId }}</h1>
        <p class="muted">
          分類：<code>{{ category }}</code>
          <span v-if="data?.level">・Level {{ data.level }}</span>
          <span v-if="data?.speakers?.length">・{{ data.speakers.length }} speakers</span>
        </p>
      </div>

      <div class="controls">
        <button class="btn" @click="prev" :disabled="!canPrev">⟵ 上一句</button>
        <button class="btn primary" @click="togglePlay" :disabled="!data || turns.length === 0">
          {{ playing ? '⏸ 暫停' : '▶️ 播放' }}
        </button>
        <button class="btn" @click="next" :disabled="!canNext">下一句 ⟶</button>

        <label class="autoplay">
          <input type="checkbox" v-model="autoplay" />
          連播
        </label>
        <button class="btn ghost" @click="restart" :disabled="!data">↺ 重新開始</button>
      </div>
    </header>

    <div v-if="loading" class="loading">載入中…</div>
    <div v-else-if="error" class="error">讀取失敗：{{ error }}</div>

    <div v-else class="chat">
      <div v-for="(t, i) in turns" :key="i" class="bubble-row" :data-side="whichForTurn(t) === 'A' ? 'left' : 'right'"
        :data-active="i === index" @click="jumpTo(i)">
        <div class="avatar" :data-side="whichForTurn(t) === 'A' ? 'left' : 'right'">
          {{ avatarInitial(t) }}
        </div>
        <div class="bubble">
          <div class="en">{{ t.en }}</div>
          <div class="zh" v-if="t.zh">{{ t.zh }}</div>
          <div class="meta">
            <span class="tag">Speaker {{ t.speaker }}</span>
            <button class="mini" @click.stop="playIndex(i)">▶️ 單句</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section v-else class="wrap">
    <div class="error">
      你的瀏覽器不支援 Web Speech Synthesis。請改用最新版 Chrome / Edge / Safari。
    </div>
  </section>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTtsStore } from '@/stores/tts';

const route = useRoute();
const tts = useTtsStore();

const category = ref(route.params.category);
const dialogueId = ref(route.params.dialogueId);

const loading = ref(false);
const error = ref(null);
const data = ref(null);
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// 播放狀態
const index = ref(0);
const playing = ref(false);
const autoplay = ref(true);

const turns = computed(() => data?.value?.turns || []);
const canPrev = computed(() => index.value > 0);
const canNext = computed(() => index.value < turns.value.length - 1);

function mapSpeakerToWhich() {
  // 依 speakers 陣列順序：第1位 -> A、第2位 -> B；其餘同 ID 落在其對應，找不到則交替
  const map = {};
  const sp = data.value?.speakers || [];
  if (sp[0]) map[sp[0].id || sp[0].name || 'A'] = 'A';
  if (sp[1]) map[sp[1].id || sp[1].name || 'B'] = 'B';
  return map;
}
const speakerMap = ref({});

function whichForTurn(turn) {
  const key = turn.speaker || '';
  if (speakerMap.value[key]) return speakerMap.value[key];
  // 若沒在 map 中，依照出現次序猜測：偶數 A、奇數 B（或全用 A 也行）
  return 'A';
}

function avatarInitial(t) {
  // 取說話者首字母
  const sp = (data.value?.speakers || []).find(s => (s.id === t.speaker) || (s.name === t.speaker));
  const name = sp?.name || String(t.speaker || '');
  return name.slice(0, 1).toUpperCase() || 'S';
}

async function load() {
  loading.value = true;
  error.value = null;
  data.value = null;
  try {
    const path = `/content/conversation/${category.value}/${dialogueId.value}.json`;
    const r = await fetch(path, { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data.value = await r.json();
    speakerMap.value = mapSpeakerToWhich();
    index.value = 0;
    // 若還沒載入 voices，初始化一次（避免直接播放時沒有 voice）
    if (supported && !tts.ready) await tts.init();
  } catch (e) {
    error.value = e?.message || String(e);
  } finally {
    loading.value = false;
  }
}

function playCurrent() {
  if (!supported || !turns.value.length) return;
  const t = turns.value[index.value];
  if (!t || !t.en) return;
  const which = whichForTurn(t);
  tts.speak(t.en, which, {
    onend: () => {
      if (!autoplay.value) return;
      if (index.value < turns.value.length - 1) {
        index.value += 1;
        scrollIntoView(index.value);
        // 延遲一下讓瀏覽器回收上一句
        setTimeout(playCurrent, 40);
      } else {
        playing.value = false;
      }
    },
    onstart: () => { playing.value = true; },
    onerror: () => { playing.value = false; }
  });
}

function togglePlay() {
  if (!playing.value) {
    playCurrent();
  } else {
    tts.cancel();
    playing.value = false;
  }
}

function next() {
  if (!canNext.value) return;
  tts.cancel();
  index.value += 1;
  scrollIntoView(index.value);
  if (playing.value || autoplay.value) playCurrent();
}

function prev() {
  if (!canPrev.value) return;
  tts.cancel();
  index.value -= 1;
  scrollIntoView(index.value);
  if (playing.value || autoplay.value) playCurrent();
}

function restart() {
  tts.cancel();
  index.value = 0;
  scrollIntoView(index.value);
  if (autoplay.value) playCurrent();
}

function playIndex(i) {
  tts.cancel();
  index.value = i;
  scrollIntoView(index.value);
  playCurrent();
}

function jumpTo(i) {
  // 點泡泡只跳到該句，不自動播放（避免誤觸）；若想單擊播放可改呼叫 playIndex
  index.value = i;
  scrollIntoView(index.value);
}

function scrollIntoView(i) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-active="true"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// 路由變更時重新讀檔
watch(() => route.fullPath, () => {
  category.value = route.params.category;
  dialogueId.value = route.params.dialogueId;
  tts.cancel();
  playing.value = false;
  load();
});

onMounted(() => {
  load();
  // 鍵盤快捷鍵：Space 播放/暫停、← / →
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  tts.cancel();
  window.removeEventListener('keydown', onKey);
});

function onKey(e) {
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    next();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prev();
  }
}
</script>

<style scoped>
/* 基礎排版 */
.wrap {
  max-width: 880px;
  margin: 0 auto;
  padding: 0 12px;
}

.head {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: start;
  margin-bottom: 12px;
}

h1 {
  margin: 0 0 6px;
  font-size: 22px;
}

.muted {
  color: #93a0b5;
}

code {
  word-break: break-word;
}

/* 控制列 */
.controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.autoplay {
  color: #c8d3e0;
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.btn {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #2a3a6b;
  background: #192653;
  color: #e7ecf5;
  cursor: pointer;
  min-height: 38px;
}

.btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(180deg, #5b8cff, #3a6cff);
  border-color: #3a6cff;
}

.btn.ghost {
  background: transparent;
  border-color: #2a3a6b;
  color: #c8d3e0;
}

.loading {
  color: #c8d3e0;
}

.error {
  background: #2a1430;
  border: 1px solid #5a285e;
  border-radius: 12px;
  padding: 12px;
  color: #ffddea;
}

/* 對話泡泡 */
.chat {
  display: grid;
  gap: 10px;
  padding: 6px 0 24px;
}

.bubble-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: flex-start;
}

.bubble-row[data-side="right"] {
  grid-template-columns: minmax(0, 1fr) 44px;
}

.bubble-row[data-side="right"] .avatar {
  order: 2;
}

.bubble-row[data-side="right"] .bubble {
  order: 1;
  justify-self: end;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  flex: 0 0 auto;
  background: #0e1427;
  border: 1px solid #25304d;
  color: #cbd5e1;
}

.avatar[data-side="right"] {
  background: #0f1a35;
}

/* 泡泡最大寬度：用剩餘寬度計算，避免超出畫面 */
.bubble {
  max-width: calc(100% - 56px);
  background: #11182d;
  border: 1px solid #1f2a44;
  border-radius: 16px;
  padding: 10px 12px;
  color: #e7ecf5;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.bubble-row[data-active="true"] .bubble {
  border-color: #5b8cff;
  box-shadow: 0 0 0 2px rgba(91, 140, 255, .25) inset;
}

.en {
  font-weight: 600;
  line-height: 1.4;
}

.zh {
  color: #9fb0c7;
  margin-top: 4px;
}

.meta {
  margin-top: 6px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.tag {
  font-size: 12px;
  color: #cbd5e1;
  background: #1a2340;
  border: 1px solid #2a3a6b;
  padding: 2px 6px;
  border-radius: 999px;
}

.mini {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 999px;
  border: 1px solid #2a3a6b;
  background: #192653;
  color: #e7ecf5;
  cursor: pointer;
}

.mini:hover {
  filter: brightness(1.08);
}

/* ————— RWD：小螢幕優化 ————— */
@media (max-width: 640px) {
  .wrap {
    padding: 0 10px;
  }

  .head {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  h1 {
    font-size: 20px;
  }

  .controls {
    justify-content: flex-start;
    gap: 6px;
  }

  .btn {
    flex: 1 1 auto;
    min-width: 120px;
    min-height: 40px;
  }

  .btn.primary {
    flex: 0 0 auto;
  }

  /* 主要按鈕保留原寬 */

  .bubble-row {
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 8px;
  }

  .bubble-row[data-side="right"] {
    grid-template-columns: minmax(0, 1fr) 36px;
  }

  .avatar {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .bubble {
    max-width: calc(100% - 44px);
    padding: 10px 12px;
  }

  .en {
    font-size: 15px;
    line-height: 1.45;
  }

  .zh {
    font-size: 13px;
  }

  .meta {
    gap: 6px;
  }

  .tag {
    font-size: 11px;
    padding: 2px 6px;
  }

  .mini {
    font-size: 11px;
    padding: 4px 8px;
  }
}

/* 進一步窄螢幕（iPhone SE 等） */
@media (max-width: 380px) {
  .btn {
    min-width: 0;
    padding: 10px 10px;
  }

  .en {
    font-size: 14.5px;
  }

  .zh {
    font-size: 12.5px;
  }
}
</style>
