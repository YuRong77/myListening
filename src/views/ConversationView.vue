<template>
  <section class="wrap">
    <header class="head">
      <h1>對話分類</h1>
      <button class="btn ghost" @click="reload" :disabled="loading">重新整理</button>
    </header>

    <div v-if="loading" class="skeleton-grid">
      <div class="skeleton-card" v-for="n in 8" :key="n"></div>
    </div>

    <div v-else-if="error" class="error">
      <p>讀取分類失敗：{{ error }}</p>
    </div>

    <div v-else class="grid">
      <button v-for="cat in categories" :key="cat.id" class="card" @click="openCategory(cat)">
        <div class="icon" :data-accent="cat.accent || ''">
          <span>{{ iconEmoji(cat) }}</span>
        </div>
        <div class="meta">
          <div class="title"><strong>{{ cat.name_zh || cat.name || cat.id }}</strong></div>
          <div class="subtitle">
            <span>{{ cat.name_en || toTitle(cat.id) }}</span>
            <span v-if="cat.estimated_count" class="count">・{{ cat.estimated_count }} 篇</span>
          </div>
        </div>
      </button>
    </div>

    <!-- Popup -->
    <SimpleModal v-if="showModal" @close="closeModal">
      <template #title>
        <strong>{{ currentCategory?.name_zh || toTitle(currentCategory?.id) }}</strong>
        <small style="opacity:.75;margin-left:8px;">{{ currentCategory?.name_en }}</small>
      </template>

      <div v-if="manifestLoading" class="list-skeleton">
        <div class="s-row" v-for="n in 8" :key="n"></div>
      </div>

      <div v-else-if="manifestError" class="error">
        讀取清單失敗：{{ manifestError }}
      </div>

      <ul v-else class="list">
        <li v-for="item in manifestItems" :key="item.id">
          <button class="row" @click="openDialogue(item)">
            <div class="titles">
              <div class="en">{{ item.title_en || item.title || item.id }}</div>
              <div class="zh" v-if="item.title_zh">{{ item.title_zh }}</div>
            </div>
            <div class="meta">
              <span v-if="item.level" class="tag">{{ item.level }}</span>
              <span v-if="item.estimated_duration_sec" class="tag">{{ Math.round(item.estimated_duration_sec / 60) }}
                min</span>
              <span v-if="item.speakers" class="tag">{{ item.speakers }} speakers</span>
            </div>
          </button>
        </li>
      </ul>
    </SimpleModal>

    <p class="hint">點分類卡片會開啟該分類的對話清單（popup）。</p>
  </section>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useContentStore } from '@/stores/content';
import SimpleModal from '@/components/SimpleModal.vue';

const router = useRouter();
const store = useContentStore();

const showModal = ref(false);
const currentCategory = ref(null);
const manifestItems = ref([]);

onMounted(() => {
  store.loadCategories();
});

const loading = computed(() => store.loading);
const error = computed(() => store.error);

const manifestLoading = computed(() => store.manifestLoading);
const manifestError = computed(() => store.manifestError);
const categories = computed(() => store.categories);

function reload() {
  store.loadCategories(true);
}

function toTitle(id = '') {
  return id.replace(/[-_]/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
}

const iconMap = {
  'office-business': '🏢',
  'hr-employment': '💼',
  'calls-meetings': '📞',
  'travel-transport': '✈️',
  'dining-shopping': '🛍️',
  'customer-support': '🎧',
  'finance-banking': '💳',
  'housing-living': '🏠',
  'healthcare': '🏥',
  'education-events': '🎓',
};
function iconEmoji(cat) { return iconMap[cat.id] || '📚'; }

async function openCategory(cat) {
  currentCategory.value = cat;
  showModal.value = true;
  try {
    const pack = await store.loadManifest(cat);
    manifestItems.value = pack.items || [];
  } catch { /* 已在 store 設定 manifestError */ }
}

function closeModal() {
  showModal.value = false;
  currentCategory.value = null;
  manifestItems.value = [];
}

function openDialogue(item) {
  // 從 item.path 推出 category/id 以做路由（也可直接帶 query/path）
  // path 例：/content/conversation/enterprise/ent-kickoff-001.json
  const m = (item.path || '').match(/\/content\/conversation\/([^/]+)\/([^/]+)\.json$/);
  const category = m?.[1] || currentCategory.value?.id || 'unknown';
  const dialogueId = m?.[2] || item.id || 'unknown';
  closeModal();
  router.push({ name: 'dialogue', params: { category, dialogueId } });
}
</script>

<style scoped>
.wrap {
  max-width: 1080px;
  margin: 0 auto;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

h1 {
  margin: 0;
  font-size: 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.card {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: #11182d;
  border: 1px solid #1f2a44;
  color: #e7ecf5;
  text-align: left;
  cursor: pointer;
  transition: transform .08s, box-shadow .15s, background .2s;
}

.card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, .25);
}

.icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #0e1427;
  border: 1px solid #25304d;
  font-size: 26px;
}

.icon[data-accent="blue"] {
  border-color: #3862ff66;
}

/* 其餘色系略，同前版本 */

.meta .title {
  font-size: 16px;
  line-height: 1.15;
  margin-bottom: 4px;
}

.meta .subtitle {
  color: #93a0b5;
  font-size: 13px;
}

.count {
  opacity: .9;
}

.btn {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #2a3a6b;
  background: #192653;
  color: #e7ecf5;
  cursor: pointer;
}

.btn.ghost {
  background: transparent;
  border-color: #2a3a6b;
  color: #c8d3e0;
}

.btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.error {
  background: #2a1430;
  border: 1px solid #5a285e;
  border-radius: 12px;
  padding: 12px;
  color: #ffddea;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.skeleton-card {
  height: 80px;
  border-radius: 14px;
  background: linear-gradient(90deg, #0e1427 25%, #141b31 37%, #0e1427 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s infinite;
  border: 1px solid #1f2a44;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0
  }

  100% {
    background-position: 0 0
  }
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.row {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #25304d;
  background: #0e1427;
  color: #e7ecf5;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
}

.row:hover {
  filter: brightness(1.05);
}

.titles .en {
  font-weight: 600;
}

.titles .zh {
  color: #93a0b5;
  font-size: 13px;
  margin-top: 2px;
}

.meta .tag {
  font-size: 12px;
  color: #cbd5e1;
  background: #1a2340;
  border: 1px solid #2a3a6b;
  padding: 2px 6px;
  border-radius: 999px;
  margin-left: 6px;
}

.list-skeleton {
  display: grid;
  gap: 8px;
}

.s-row {
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(90deg, #0e1427 25%, #141b31 37%, #0e1427 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s infinite;
  border: 1px solid #1f2a44;
}

.hint {
  color: #93a0b5;
  font-size: 13px;
  margin-top: 12px;
}
</style>
