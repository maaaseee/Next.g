import { createRouter, createWebHistory } from 'vue-router';
import CatalogView from '@/views/CatalogView.vue';
import RouletteView from '@/views/RouletteView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'catalog',
      component: CatalogView,
    },
    {
      path: '/roulette',
      name: 'roulette',
      component: RouletteView,
    },
  ],
});

export default router;
