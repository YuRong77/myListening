<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="head">
        <slot name="title"></slot>
        <button class="x" @click="$emit('close')">✕</button>
      </header>
      <div class="body">
        <slot></slot>
      </div>
      <footer v-if="$slots.footer" class="foot">
        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>

<script setup>
// 無邏輯，純視圖
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  display: grid;
  place-items: center;
  z-index: 40;
}

.modal {
  width: min(720px, 92vw);
  max-height: 80vh;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: #11182d;
  border: 1px solid #1f2a44;
  border-radius: 14px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, .45);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #1f2a44;
}

.body {
  padding: 12px 14px;
  overflow: auto;
}

.foot {
  padding: 10px 14px;
  border-top: 1px solid #1f2a44;
}

.x {
  background: transparent;
  border: 1px solid #2a3a6b;
  color: #e7ecf5;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}

.x:hover {
  filter: brightness(1.1);
}
</style>
