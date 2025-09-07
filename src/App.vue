<template>
  <div class="app-root">
    <main class="page">
      <router-view />
    </main>

    <footer class="footer">
      <nav class="tabs">
        <RouterLink :to="{ name: 'conversation' }" class="tab" :class="{ active: route.name === 'conversation' }">
          💬 對話
        </RouterLink>
        <RouterLink :to="{ name: 'settings' }" class="tab" :class="{ active: route.name === 'settings' }">
          ⚙️ 設置
        </RouterLink>
      </nav>
    </footer>
  </div>
</template>

<script setup>
import { useRoute, RouterLink } from 'vue-router';
const route = useRoute();
</script>

<style>
:root {
  --bg: #0b1020;
  --card: #11182d;
  --text: #e7ecf5;
  --muted: #93a0b5;
  --brand: #5b8cff;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

.app-root {
  min-height: 100%;
  display: grid;
  grid-template-rows: 1fr auto;
}

.page {
  padding: 16px;
}

.footer {
  border-top: 1px solid #1f2a44;
  background: rgba(10, 14, 30, 0.8);
  backdrop-filter: blur(6px);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px 12px;
}

.tab {
  text-decoration: none;
  color: var(--muted);
  background: var(--card);
  padding: 12px 16px;
  border-radius: 12px;
  text-align: center;
  transition: transform .08s ease, color .2s ease, background .2s ease;
}

.tab:hover {
  transform: translateY(-1px);
}

.tab.active {
  color: white;
  background: linear-gradient(180deg, #5b8cff, #3a6cff);
  box-shadow: 0 6px 16px rgba(91, 140, 255, .35);
}
</style>
