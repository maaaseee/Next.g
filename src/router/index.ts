import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0, left: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/library',
      name: 'library',
      component: () => import('@/views/CatalogView.vue'),
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('@/views/ExploreView.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchView.vue'),
    },
    {
      path: '/community',
      redirect: (to) => ({
        path: '/search',
        query: { category: 'users', ...to.query },
      }),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/faq',
      name: 'faq',
      component: () => import('@/views/FaqView.vue'),
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('@/views/TermsView.vue'),
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/views/PrivacyView.vue'),
    },
    {
      path: '/game/:id',
      name: 'game-detail',
      component: () => import('@/views/GameDetailView.vue'),
    },
    {
      path: '/user/:id',
      name: 'user-profile',
      component: () => import('@/views/UserProfileView.vue'),
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/SetupView.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/choose-nickname',
      name: 'choose-nickname',
      component: () => import('@/views/ChooseNicknameView.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/roulette',
      name: 'roulette',
      component: () => import('@/views/RouletteView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      const user = await authStore.fetchMe()
      if (!user) {
        return { path: '/login', query: { redirect: to.fullPath } }
      }
    }
  }

  // Privacy protection: Ensure OAuth users confirm/choose their GamerTag before using public features
  if (
    authStore.isAuthenticated &&
    authStore.user &&
    !authStore.user.onboarded &&
    authStore.user.provider !== 'local' &&
    to.path !== '/choose-nickname' &&
    to.path !== '/setup' &&
    to.path !== '/terms' &&
    to.path !== '/privacy' &&
    to.path !== '/login'
  ) {
    return { path: '/choose-nickname' }
  }
})

export default router
