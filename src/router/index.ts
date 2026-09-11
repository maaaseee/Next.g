import { createRouter, createWebHistory } from 'vue-router';
import CatalogView from '@/views/CatalogView.vue';
import RouletteView from '@/views/RouletteView.vue';
import NotFoundView from '@/views/NotFoundView.vue';

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
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
});

router.beforeEach(() => {
  document.title = 'NEXT.g — Backlog';
});

export default router;
