import { createRouter, createWebHashHistory } from 'vue-router'

const ConversationView = () => import('@/views/ConversationView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')
const DialogueView = () => import('@/views/DialogueView.vue') // ⬅ 新增

const routes = [
  { path: '/', redirect: '/conversation' },
  { path: '/conversation', name: 'conversation', component: ConversationView },
  { path: '/conversation/:category/:dialogueId', name: 'dialogue', component: DialogueView }, // ⬅ 新增
  { path: '/settings', name: 'settings', component: SettingsView },
]

export default createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes })
